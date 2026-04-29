package com.example.dna.controller;

import com.example.dna.algorithms.Algorithms;
import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatcherService {

    /**
     * Run selected algorithm(s) on the given text and pattern.
     * If algo = "ALL", runs all 5 algorithms and returns list.
     */
    public List<MatchResult> runSelected(String text, String pattern, String algo) {
        text = text.toUpperCase().replaceAll("[^ATCG]", "");
        pattern = pattern.toUpperCase().replaceAll("[^ATCG]", "");

        if (text.isEmpty() || pattern.isEmpty())
            throw new IllegalArgumentException("Text and pattern must contain valid DNA bases (A, T, C, G)");

        return switch (algo.toUpperCase()) {
            case "NAIVE"        -> List.of(Algorithms.naive(text, pattern));
            case "KMP"          -> List.of(Algorithms.kmp(text, pattern));
            case "RABIN-KARP"   -> List.of(Algorithms.rabinKarp(text, pattern));
            case "BOYER-MOORE"  -> List.of(Algorithms.boyerMoore(text, pattern));
            case "Z-ALGORITHM"  -> List.of(Algorithms.zAlgorithm(text, pattern));
            case "ALL"          -> runAll(text, pattern);
            default             -> throw new IllegalArgumentException("Unknown algorithm: " + algo);
        };
    }

    /** Run all 5 algorithms for benchmarking */
    public List<MatchResult> runAll(String text, String pattern) {
        return List.of(
                Algorithms.naive(text, pattern),
                Algorithms.kmp(text, pattern),
                Algorithms.rabinKarp(text, pattern),
                Algorithms.boyerMoore(text, pattern),
                Algorithms.zAlgorithm(text, pattern)
        );
    }

    // ─── DNA Utility Methods ─────────────────────────────────

    public String complement(String dna) {
        return dna.toUpperCase().chars()
                .mapToObj(c -> String.valueOf(switch((char)c) {
                    case 'A' -> 'T'; case 'T' -> 'A'; case 'C' -> 'G'; case 'G' -> 'C'; default -> 'N';
                })).collect(Collectors.joining());
    }

    public String reverseComplement(String dna) {
        return new StringBuilder(complement(dna)).reverse().toString();
    }

    public double gcContent(String dna) {
        dna = dna.toUpperCase();
        long gc = dna.chars().filter(c -> c == 'G' || c == 'C').count();
        return dna.isEmpty() ? 0 : (gc * 100.0 / dna.length());
    }

    public int hammingDistance(String s1, String s2) {
        s1 = s1.toUpperCase(); s2 = s2.toUpperCase();
        if (s1.length() != s2.length()) throw new IllegalArgumentException("Sequences must be equal length");
        int dist = 0;
        for (int i = 0; i < s1.length(); i++) if (s1.charAt(i) != s2.charAt(i)) dist++;
        return dist;
    }

    public int editDistance(String s1, String s2) {
        int n = s1.length(), m = s2.length();
        int[][] dp = new int[n+1][m+1];
        for (int i = 0; i <= n; i++) dp[i][0] = i;
        for (int j = 0; j <= m; j++) dp[0][j] = j;
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                dp[i][j] = s1.charAt(i-1) == s2.charAt(j-1)
                        ? dp[i-1][j-1]
                        : 1 + Math.min(dp[i-1][j-1], Math.min(dp[i-1][j], dp[i][j-1]));
        return dp[n][m];
    }

    public int[] getLPS(String pattern) {
        return Algorithms.buildLPS(pattern.toUpperCase());
    }

    public Map<String, Integer> kmerFrequency(String dna, int k) {
        dna = dna.toUpperCase();
        Map<String, Integer> freq = new TreeMap<>();
        for (int i = 0; i <= dna.length()-k; i++)
            freq.merge(dna.substring(i, i+k), 1, Integer::sum);
        return freq;
    }

    public List<String> detectMutations(String original, String mutated) {
        original = original.toUpperCase(); mutated = mutated.toUpperCase();
        List<String> mutations = new ArrayList<>();
        int len = Math.min(original.length(), mutated.length());
        for (int i = 0; i < len; i++)
            if (original.charAt(i) != mutated.charAt(i))
                mutations.add(String.format("pos%d:%c>%c", i+1, original.charAt(i), mutated.charAt(i)));
        return mutations;
    }
}