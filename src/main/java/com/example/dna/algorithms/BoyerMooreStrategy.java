package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Boyer-Moore string-matching algorithm (Bad Character heuristic).
 *
 * Scans the pattern from right to left. When a mismatch occurs, uses the
 * bad-character shift table to skip ahead. Often the fastest algorithm
 * in practice for genomic pattern search with long patterns.
 *
 * Time: O(n/m) best, O(n·m) worst
 * Space: O(σ + m) where σ is the alphabet size
 */
@Component("BOYER-MOORE")
public class BoyerMooreStrategy implements StringMatchingStrategy {

    @Override
    public MatchResult search(String text, String pattern) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        int[] bc = new int[256];
        Arrays.fill(bc, -1);
        for (int i = 0; i < m; i++) bc[pattern.charAt(i)] = i;

        int s = 0;
        while (s <= n - m) {
            int j = m - 1;
            while (j >= 0) {
                cmp++;
                if (pattern.charAt(j) == text.charAt(s + j)) j--;
                else break;
            }
            if (j < 0) {
                pos.add(s);
                s += (s + m < n) ? m - bc[text.charAt(s + m)] : 1;
            } else {
                s += Math.max(1, j - bc[text.charAt(s + j)]);
            }
        }
        return new MatchResult(getName(), pos, cmp, System.nanoTime() - t0, getComplexity());
    }

    @Override public String getName()       { return "Boyer-Moore"; }
    @Override public String getComplexity() { return "O(n/m) best"; }
}
