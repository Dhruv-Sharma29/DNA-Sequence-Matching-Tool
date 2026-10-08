package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Naive (Brute-Force) string-matching algorithm.
 *
 * Slides the pattern over the text one position at a time and checks
 * every character. No preprocessing required.
 *
 * Time: O(n·m) worst, O(n) best
 * Space: O(1)
 */
@Component("NAIVE")
public class NaiveStrategy implements StringMatchingStrategy {

    @Override
    public MatchResult search(String text, String pattern) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        for (int i = 0; i <= n - m; i++) {
            int j = 0;
            while (j < m) {
                cmp++;
                if (text.charAt(i + j) != pattern.charAt(j)) break;
                j++;
            }
            if (j == m) pos.add(i);
        }
        return new MatchResult("Naive", pos, cmp, System.nanoTime() - t0, getComplexity());
    }

    @Override public String getName()       { return "Naive"; }
    @Override public String getComplexity() { return "O(n·m)"; }
}
