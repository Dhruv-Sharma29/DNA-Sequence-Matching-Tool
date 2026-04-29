package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import java.util.*;

public class Algorithms {

    // ─── 1. NAIVE ─────────────────────────────────────────────
    public static MatchResult naive(String text, String pattern) {
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        long t0 = System.nanoTime();
        for (int i = 0; i <= n - m; i++) {
            int j = 0;
            while (j < m) { cmp++; if (text.charAt(i+j) != pattern.charAt(j)) break; j++; }
            if (j == m) pos.add(i);
        }
        return new MatchResult("Naive", pos, cmp, System.nanoTime()-t0, "O(n·m)");
    }

    // ─── 2. KMP ───────────────────────────────────────────────
    public static MatchResult kmp(String text, String pattern) {
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        int[] lps = buildLPS(pattern);
        int i = 0, j = 0;
        long t0 = System.nanoTime();
        while (i < n) {
            cmp++;
            if (text.charAt(i) == pattern.charAt(j)) { i++; j++; if (j == m) { pos.add(i-j); j = lps[j-1]; } }
            else { if (j != 0) j = lps[j-1]; else i++; }
        }
        return new MatchResult("KMP", pos, cmp, System.nanoTime()-t0, "O(n+m)");
    }

    public static int[] buildLPS(String pat) {
        int m = pat.length(); int[] lps = new int[m];
        int len = 0, i = 1;
        while (i < m) {
            if (pat.charAt(i) == pat.charAt(len)) lps[i++] = ++len;
            else if (len != 0) len = lps[len-1];
            else lps[i++] = 0;
        }
        return lps;
    }

    // ─── 3. RABIN-KARP ────────────────────────────────────────
    public static MatchResult rabinKarp(String text, String pattern) {
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        final int BASE = 4; final long MOD = 1_000_000_007L;
        if (m > n) return new MatchResult("Rabin-Karp", pos, cmp, 0, "O(n+m) avg");
        long h = 1;
        for (int i = 0; i < m-1; i++) h = (h*BASE) % MOD;
        long ph = 0, th = 0;
        for (int i = 0; i < m; i++) {
            ph = (BASE*ph + val(pattern.charAt(i))) % MOD;
            th = (BASE*th + val(text.charAt(i))) % MOD;
        }
        long t0 = System.nanoTime();
        for (int i = 0; i <= n-m; i++) {
            if (ph == th) {
                boolean match = true;
                for (int j = 0; j < m; j++) { cmp++; if (text.charAt(i+j) != pattern.charAt(j)) { match = false; break; } }
                if (match) pos.add(i);
            }
            if (i < n-m) {
                th = (BASE*(th - val(text.charAt(i))*h) + val(text.charAt(i+m))) % MOD;
                if (th < 0) th += MOD;
            }
        }
        return new MatchResult("Rabin-Karp", pos, cmp, System.nanoTime()-t0, "O(n+m) avg");
    }

    private static long val(char c) {
        return switch(c) { case 'A' -> 1; case 'T' -> 2; case 'C' -> 3; case 'G' -> 4; default -> 0; };
    }

    // ─── 4. BOYER-MOORE ───────────────────────────────────────
    public static MatchResult boyerMoore(String text, String pattern) {
        List<Integer> pos = new ArrayList<>();
        int cmp = 0, n = text.length(), m = pattern.length();
        int[] bc = new int[256]; Arrays.fill(bc, -1);
        for (int i = 0; i < m; i++) bc[pattern.charAt(i)] = i;
        int s = 0;
        long t0 = System.nanoTime();
        while (s <= n-m) {
            int j = m-1;
            while (j >= 0) { cmp++; if (pattern.charAt(j) == text.charAt(s+j)) j--; else break; }
            if (j < 0) { pos.add(s); s += (s+m < n) ? m - bc[text.charAt(s+m)] : 1; }
            else s += Math.max(1, j - bc[text.charAt(s+j)]);
        }
        return new MatchResult("Boyer-Moore", pos, cmp, System.nanoTime()-t0, "O(n/m) best");
    }

    // ─── 5. Z-ALGORITHM ───────────────────────────────────────
    public static MatchResult zAlgorithm(String text, String pattern) {
        List<Integer> pos = new ArrayList<>();
        String concat = pattern + "$" + text;
        int n = concat.length(), m = pattern.length();
        int[] z = new int[n]; int l = 0, r = 0;
        for (int i = 1; i < n; i++) {
            if (i < r) z[i] = Math.min(r-i, z[i-l]);
            while (i+z[i] < n && concat.charAt(z[i]) == concat.charAt(i+z[i])) z[i]++;
            if (i+z[i] > r) { l = i; r = i+z[i]; }
        }
        for (int i = m+1; i < n; i++) if (z[i] == m) pos.add(i-m-1);
        return new MatchResult("Z-Algorithm", pos, n, 0, "O(n+m)");
    }
}