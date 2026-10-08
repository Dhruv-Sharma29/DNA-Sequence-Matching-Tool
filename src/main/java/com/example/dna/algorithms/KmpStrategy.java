package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Knuth-Morris-Pratt (KMP) string-matching algorithm.
 *
 * Preprocesses the pattern to build an LPS (Longest Proper Prefix = Suffix)
 * array, enabling the algorithm to skip redundant comparisons on mismatch.
 * The text pointer never moves backwards, making KMP ideal for streaming.
 *
 * Time: O(n+m)
 * Space: O(m) for the LPS array
 */
@Component("KMP")
public class KmpStrategy implements StringMatchingStrategy {

    @Override
    public MatchResult search(String text, String pattern) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        int[] lps = buildLPS(pattern);
        int i = 0, j = 0;
        while (i < n) {
            cmp++;
            if (text.charAt(i) == pattern.charAt(j)) {
                i++;
                j++;
                if (j == m) {
                    pos.add(i - j);
                    j = lps[j - 1];
                }
            } else {
                if (j != 0) j = lps[j - 1];
                else i++;
            }
        }
        return new MatchResult("KMP", pos, cmp, System.nanoTime() - t0, getComplexity());
    }

    /**
     * Build the LPS (failure function) array.
     * lps[i] = length of the longest proper prefix of pattern[0..i]
     *          that is also a suffix of pattern[0..i].
     */
    public static int[] buildLPS(String pat) {
        int m = pat.length();
        int[] lps = new int[m];
        int len = 0, i = 1;
        while (i < m) {
            if (pat.charAt(i) == pat.charAt(len)) {
                lps[i++] = ++len;
            } else if (len != 0) {
                len = lps[len - 1];
            } else {
                lps[i++] = 0;
            }
        }
        return lps;
    }

    @Override public String getName()       { return "KMP"; }
    @Override public String getComplexity() { return "O(n+m)"; }
}
