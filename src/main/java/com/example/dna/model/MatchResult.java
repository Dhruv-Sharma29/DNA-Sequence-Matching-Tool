package com.example.dna.model;

import java.util.List;

public class MatchResult {
    private String name;
    private List<Integer> positions;
    private int comparisons;
    private long timeNs;
    private String complexity;

    public MatchResult(String name, List<Integer> positions, int comparisons, long timeNs, String complexity) {
        this.name = name;
        this.positions = positions;
        this.comparisons = comparisons;
        this.timeNs = timeNs;
        this.complexity = complexity;
    }

    public String getName() { return name; }
    public List<Integer> getPositions() { return positions; }
    public int getComparisons() { return comparisons; }
    public long getTimeNs() { return timeNs; }
    public String getComplexity() { return complexity; }
}