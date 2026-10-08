package com.example.dna.algorithms;

import com.example.dna.model.MatchResult;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Aho-Corasick multi-pattern string-matching algorithm.
 *
 * Builds an automaton (trie + failure links) from the pattern(s), then
 * scans the text in a single pass. Failure links are conceptually similar
 * to the KMP failure function but generalized to a trie structure.
 *
 * For a single pattern, this behaves similarly to KMP.
 * The real power emerges with multiple patterns searched simultaneously.
 *
 * Time: O(n + m + z) where z = number of matches
 * Space: O(m × σ) for the automaton
 *
 * Use case in bioinformatics: searching for multiple gene motifs / regulatory
 * sequences in a genome simultaneously.
 */
@Component("AHO-CORASICK")
public class AhoCorasickStrategy implements StringMatchingStrategy {

    @Override
    public MatchResult search(String text, String pattern) {
        // Support multi-pattern: split on comma
        String[] patterns = pattern.contains(",")
                ? pattern.split(",")
                : new String[]{ pattern };

        return searchMultiple(text, patterns);
    }

    /**
     * Build the Aho-Corasick automaton and search for all patterns.
     */
    public MatchResult searchMultiple(String text, String[] patterns) {
        // Include allocation and preprocessing in the reported elapsed time.
        long t0 = System.nanoTime();
        int n = text.length();
        int cmp = 0;

        // --- Step 1: Build the Trie ---
        // Each node: children[256], fail link, output (list of pattern indices)
        int maxStates = 1;
        for (String p : patterns) maxStates += p.length();

        int[][] goTo = new int[maxStates][256];
        for (int[] row : goTo) Arrays.fill(row, -1);
        int[] fail = new int[maxStates];
        List<List<Integer>> output = new ArrayList<>();
        for (int i = 0; i < maxStates; i++) output.add(new ArrayList<>());

        int states = 1; // state 0 is root

        // Insert all patterns into the trie
        for (int pi = 0; pi < patterns.length; pi++) {
            String pat = patterns[pi].trim();
            int cur = 0;
            for (int j = 0; j < pat.length(); j++) {
                int c = pat.charAt(j);
                if (goTo[cur][c] == -1) {
                    goTo[cur][c] = states++;
                }
                cur = goTo[cur][c];
            }
            output.get(cur).add(pi);
        }

        // --- Step 2: Build failure links (BFS from root) ---
        Queue<Integer> queue = new LinkedList<>();
        for (int c = 0; c < 256; c++) {
            if (goTo[0][c] != -1) {
                fail[goTo[0][c]] = 0;
                queue.add(goTo[0][c]);
            } else {
                goTo[0][c] = 0; // implicit self-loop at root
            }
        }

        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int c = 0; c < 256; c++) {
                int v = goTo[u][c];
                if (v != -1) {
                    fail[v] = goTo[fail[u]][c];
                    // Merge outputs from the failure link
                    output.get(v).addAll(output.get(fail[v]));
                    queue.add(v);
                } else {
                    goTo[u][c] = goTo[fail[u]][c];
                }
            }
        }

        // --- Step 3: Search the text ---
        List<Integer> positions = new ArrayList<>();
        Set<Integer> positionSet = new TreeSet<>(); // deduplicate
        int cur = 0;

        for (int i = 0; i < n; i++) {
            cmp++;
            cur = goTo[cur][text.charAt(i)];
            for (int pi : output.get(cur)) {
                int pos = i - patterns[pi].trim().length() + 1;
                positionSet.add(pos);
            }
        }

        positions.addAll(positionSet);
        return new MatchResult(getName(), positions, cmp, System.nanoTime() - t0, getComplexity());
    }

    @Override public String getName()       { return "Aho-Corasick"; }
    @Override public String getComplexity() { return "O(n+m+z)"; }
}
