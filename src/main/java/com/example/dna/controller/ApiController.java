package com.example.dna.controller;

import com.example.dna.dto.*;
import com.example.dna.model.MatchResult;
import com.example.dna.model.SearchHistory;
import com.example.dna.repository.SearchHistoryRepository;
import com.example.dna.service.MatcherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for DNA pattern matching operations.
 * All endpoints use typed DTOs with bean validation.
 */
@RestController
@RequestMapping("/api")
@Tag(name = "DNA Pattern Matching", description = "APIs for genome sequence pattern matching and bioinformatics utilities")
public class ApiController {

    private final MatcherService matcherService;
    private final SearchHistoryRepository historyRepository;

    public ApiController(MatcherService matcherService, SearchHistoryRepository historyRepository) {
        this.matcherService = matcherService;
        this.historyRepository = historyRepository;
    }

    // ─── POST /api/match ─────────────────────────────────────
    @PostMapping("/match")
    @Operation(summary = "Run pattern matching", description = "Search for a pattern in a DNA sequence using the specified algorithm")
    public ResponseEntity<Map<String, Object>> match(@Valid @RequestBody MatchRequest req) {
        List<MatchResult> results = matcherService.runSelected(req.text(), req.pattern(), req.algo());
        MatchResult first = results.get(0);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success",   true);
        res.put("matches",   first.getPositions().size());
        res.put("positions", first.getPositions());
        res.put("results",   results.stream().map(this::toMap).toList());

        return ResponseEntity.ok(res);
    }

    // ─── POST /api/benchmark ─────────────────────────────────
    @PostMapping("/benchmark")
    @Operation(summary = "Benchmark all algorithms", description = "Run all algorithms on the same input and compare performance")
    public ResponseEntity<Map<String, Object>> benchmark(@Valid @RequestBody BenchmarkRequest req) {
        List<MatchResult> results = matcherService.runAll(req.text(), req.pattern());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success",       true);
        res.put("textLength",    req.text().length());
        res.put("patternLength", req.pattern().length());
        res.put("results",       results.stream().map(this::toMap).toList());

        return ResponseEntity.ok(res);
    }

    // ─── POST /api/dna/utils ─────────────────────────────────
    @PostMapping("/dna/utils")
    @Operation(summary = "DNA utilities", description = "Bioinformatics operations: complement, GC content, edit distance, etc.")
    public ResponseEntity<Map<String, Object>> utils(@Valid @RequestBody UtilsRequest req) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("op", req.op());

        switch (req.op()) {
            case "complement"    -> res.put("result", matcherService.complement(req.seq()));
            case "revcomp"       -> res.put("result", matcherService.reverseComplement(req.seq()));
            case "gc"            -> res.put("result", String.format("%.2f%%", matcherService.gcContent(req.seq())));
            case "hamming"       -> res.put("result", matcherService.hammingDistance(req.seq(), req.seq2()));
            case "edit"          -> res.put("result", matcherService.editDistance(req.seq(), req.seq2()));
            case "lps"           -> res.put("result", matcherService.getLPS(req.seq()));
            case "kmer"          -> res.put("result", matcherService.kmerFrequency(req.seq(), req.k()));
            case "mutate"        -> res.put("result", matcherService.detectMutations(req.seq(), req.seq2()));
            default              -> throw new IllegalArgumentException("Unknown operation: " + req.op());
        }

        return ResponseEntity.ok(res);
    }

    // ─── GET /api/health ─────────────────────────────────────
    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Returns API status")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "GenomeScan API", "version", "2.0"));
    }

    // ─── GET /api/history ────────────────────────────────────
    @GetMapping("/history")
    @Operation(summary = "Search history", description = "Returns recent search history from the database")
    public ResponseEntity<Map<String, Object>> history() {
        List<SearchHistory> entries = historyRepository.findTop50ByOrderByTimestampDesc();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("count", entries.size());
        res.put("entries", entries);
        return ResponseEntity.ok(res);
    }

    // ─── DELETE /api/history ─────────────────────────────────
    @DeleteMapping("/history")
    @Operation(summary = "Clear history", description = "Deletes all search history entries")
    public ResponseEntity<Map<String, Object>> clearHistory() {
        historyRepository.deleteAll();
        return ResponseEntity.ok(Map.of("success", true, "message", "History cleared"));
    }

    // ─── Helper ──────────────────────────────────────────────

    private Map<String, Object> toMap(MatchResult r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name",        r.getName());
        m.put("comparisons", r.getComparisons());
        m.put("timeNs",      r.getTimeNs());
        m.put("complexity",  r.getComplexity());
        m.put("matches",     r.getPositions().size());
        m.put("positions",   r.getPositions());
        return m;
    }
}