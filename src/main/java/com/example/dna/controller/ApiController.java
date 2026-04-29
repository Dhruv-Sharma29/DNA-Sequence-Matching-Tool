package com.example.dna.controller;

import com.example.dna.model.MatchResult;
import com.example.dna.controller.MatcherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")   // allows frontend on different port to call this
public class ApiController {

    @Autowired
    private MatcherService matcherService;

    // ─── POST /api/match ─────────────────────────────────────
    // Body: { "text": "ATGCAT...", "pattern": "ATG", "algo": "KMP" }
    @PostMapping("/match")
    public ResponseEntity<Map<String, Object>> match(@RequestBody Map<String, String> req) {
        try {
            String text    = req.getOrDefault("text", "");
            String pattern = req.getOrDefault("pattern", "");
            String algo    = req.getOrDefault("algo", "ALL");

            List<MatchResult> results = matcherService.runSelected(text, pattern, algo);
            MatchResult first = results.get(0);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success",   true);
            res.put("matches",   first.getPositions().size());
            res.put("positions", first.getPositions());
            res.put("results",   results.stream().map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name",        r.getName());
                m.put("comparisons", r.getComparisons());
                m.put("timeNs",      r.getTimeNs());
                m.put("complexity",  r.getComplexity());
                m.put("matches",     r.getPositions().size());
                return m;
            }).toList());

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    // ─── POST /api/benchmark ─────────────────────────────────
    // Runs ALL 5 algorithms and returns comparison stats
    @PostMapping("/benchmark")
    public ResponseEntity<Map<String, Object>> benchmark(@RequestBody Map<String, String> req) {
        try {
            String text    = req.getOrDefault("text", "");
            String pattern = req.getOrDefault("pattern", "");

            List<MatchResult> results = matcherService.runAll(text, pattern);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("textLength", text.length());
            res.put("patternLength", pattern.length());
            res.put("results", results.stream().map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name",        r.getName());
                m.put("comparisons", r.getComparisons());
                m.put("timeNs",      r.getTimeNs());
                m.put("complexity",  r.getComplexity());
                return m;
            }).toList());

            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ─── POST /api/dna/utils ─────────────────────────────────
    // Body: { "op": "gc", "seq": "ATGCAT", "seq2": "..." }
    @PostMapping("/dna/utils")
    public ResponseEntity<Map<String, Object>> utils(@RequestBody Map<String, String> req) {
        try {
            String op   = req.getOrDefault("op", "");
            String seq  = req.getOrDefault("seq", "");
            String seq2 = req.getOrDefault("seq2", "");
            int k       = Integer.parseInt(req.getOrDefault("k", "3"));

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("op", op);

            switch (op) {
                case "complement"  -> res.put("result", matcherService.complement(seq));
                case "revcomp"     -> res.put("result", matcherService.reverseComplement(seq));
                case "gc"          -> res.put("result", String.format("%.2f%%", matcherService.gcContent(seq)));
                case "hamming"     -> res.put("result", matcherService.hammingDistance(seq, seq2));
                case "edit"        -> res.put("result", matcherService.editDistance(seq, seq2));
                case "lps"         -> res.put("result", matcherService.getLPS(seq));
                case "kmer"        -> res.put("result", matcherService.kmerFrequency(seq, k));
                case "mutate"      -> res.put("result", matcherService.detectMutations(seq, seq2));
                default            -> throw new IllegalArgumentException("Unknown operation: " + op);
            }

            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ─── GET /api/health ─────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "DNA Matcher API"));
    }
}