package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Z-Algorithm for string matching.
 *
 * Concatenates pattern + "$" + text and builds the Z-array, where Z[i]
 * is the length of the longest substring starting at i that matches a
 * prefix of the concatenated string. Positions where Z[i] == m are matches.
 *
 * Time: O(n+m)
 * Space: O(n+m) for the Z-array
 */
@Component("Z-ALGORITHM")
public class ZAlgorithmStrategy implements StringMatchingStrategy {

    @Override
    public MatchResult search(String text, String pattern) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        List<Integer> pos = new ArrayList<>();
        String concat = pattern + "$" + text;
        int n = concat.length(), m = pattern.length();
        int[] z = new int[n];
        int l = 0, r = 0;
        int cmp = 0;

        for (int i = 1; i < n; i++) {
            if (i < r) z[i] = Math.min(r - i, z[i - l]);
            while (i + z[i] < n && concat.charAt(z[i]) == concat.charAt(i + z[i])) {
                z[i]++;
                cmp++;
            }
            if (i + z[i] > r) {
                l = i;
                r = i + z[i];
            }
        }
        for (int i = m + 1; i < n; i++) {
            if (z[i] == m) pos.add(i - m - 1);
        }
        return new MatchResult(getName(), pos, cmp, System.nanoTime() - t0, getComplexity());
    }

    @Override public String getName()       { return "Z-Algorithm"; }
    @Override public String getComplexity() { return "O(n+m)"; }
}
