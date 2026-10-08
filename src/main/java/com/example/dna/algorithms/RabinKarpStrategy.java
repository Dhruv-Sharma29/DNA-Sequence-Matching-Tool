package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Rabin-Karp string-matching algorithm using rolling polynomial hash.
 *
 * Uses DNA-specific alphabet (BASE=4) with character mapping A=1, T=2, C=3, G=4.
 * Computes hash of the pattern and each window of the text; only performs
 * character-by-character comparison on hash match (to handle collisions).
 *
 * Time: O(n+m) average, O(n·m) worst (hash collisions)
 * Space: O(1)
 */
@Component("RABIN-KARP")
public class RabinKarpStrategy implements StringMatchingStrategy {

    private static final int BASE = 4;
    private static final long MOD = 1_000_000_007L;

    @Override
    public MatchResult search(String text, String pattern) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        if (m > n) return new MatchResult(getName(), pos, cmp, System.nanoTime() - t0, getComplexity());

        long h = 1;
        for (int i = 0; i < m - 1; i++) h = (h * BASE) % MOD;

        long ph = 0, th = 0;
        for (int i = 0; i < m; i++) {
            ph = (BASE * ph + val(pattern.charAt(i))) % MOD;
            th = (BASE * th + val(text.charAt(i))) % MOD;
        }

        for (int i = 0; i <= n - m; i++) {
            if (ph == th) {
                boolean match = true;
                for (int j = 0; j < m; j++) {
                    cmp++;
                    if (text.charAt(i + j) != pattern.charAt(j)) {
                        match = false;
                        break;
                    }
                }
                if (match) pos.add(i);
            }
            if (i < n - m) {
                th = (BASE * (th - val(text.charAt(i)) * h) + val(text.charAt(i + m))) % MOD;
                if (th < 0) th += MOD;
            }
        }
        return new MatchResult(getName(), pos, cmp, System.nanoTime() - t0, getComplexity());
    }

    /** Map DNA base to numeric value for hashing */
    public static long val(char c) {
        return switch (c) {
            case 'A' -> 1; case 'T' -> 2; case 'C' -> 3; case 'G' -> 4; default -> 0;
        };
    }

    @Override public String getName()       { return "Rabin-Karp"; }
    @Override public String getComplexity() { return "O(n+m) avg"; }
}
