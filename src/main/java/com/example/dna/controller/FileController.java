package com.example.dna.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.*;

/**
 * Controller for FASTA file upload and parsing.
 * Supports standard FASTA format used in bioinformatics.
 *
 * FASTA format:
 *   >header_line
 *   ATGCATGC...
 *   GATCGATC...
 */
@RestController
@RequestMapping("/api")
@Tag(name = "File Upload", description = "FASTA file upload and parsing")
public class FileController {

    @PostMapping("/upload/fasta")
    @Operation(summary = "Upload FASTA file", description = "Parse a FASTA file and return the sequences")
    public ResponseEntity<Map<String, Object>> uploadFasta(@RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty())
            throw new IllegalArgumentException("File is empty");

        String filename = file.getOriginalFilename();
        if (filename != null && !filename.matches(".*\\.(fasta|fa|fna|txt)$"))
            throw new IllegalArgumentException("Invalid file type. Accepted: .fasta, .fa, .fna, .txt");

        List<Map<String, String>> sequences = parseFasta(file.getInputStream());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("filename", filename);
        res.put("sequenceCount", sequences.size());
        res.put("sequences", sequences);

        return ResponseEntity.ok(res);
    }

    /**
     * Parse FASTA format: each sequence starts with '>' header line,
     * followed by one or more lines of sequence data.
     */
    private List<Map<String, String>> parseFasta(InputStream is) throws IOException {
        List<Map<String, String>> sequences = new ArrayList<>();
        StringBuilder currentSeq = new StringBuilder();
        String currentHeader = null;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;

                if (line.startsWith(">")) {
                    // Save previous sequence
                    if (currentHeader != null && !currentSeq.isEmpty()) {
                        Map<String, String> entry = new LinkedHashMap<>();
                        entry.put("header", currentHeader);
                        entry.put("sequence", currentSeq.toString().toUpperCase().replaceAll("[^ATCGN]", ""));
                        entry.put("length", String.valueOf(currentSeq.length()));
                        sequences.add(entry);
                    }
                    currentHeader = line.substring(1).trim();
                    currentSeq = new StringBuilder();
                } else {
                    currentSeq.append(line);
                }
            }
            // Don't forget the last sequence
            if (currentHeader != null && !currentSeq.isEmpty()) {
                Map<String, String> entry = new LinkedHashMap<>();
                entry.put("header", currentHeader);
                entry.put("sequence", currentSeq.toString().toUpperCase().replaceAll("[^ATCGN]", ""));
                entry.put("length", String.valueOf(currentSeq.length()));
                sequences.add(entry);
            }
        }
        return sequences;
    }
}
