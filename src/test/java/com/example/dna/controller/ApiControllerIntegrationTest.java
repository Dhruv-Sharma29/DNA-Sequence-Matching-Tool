package com.example.dna.controller;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the REST API endpoints.
 * Uses @SpringBootTest with manually configured MockMvc.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
class ApiControllerIntegrationTest {

    @Autowired
    private WebApplicationContext ctx;

    private MockMvc mvc;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(ctx).build();
    }

    // ─── POST /api/match ─────────────────────────────────────

    @Test
    @DisplayName("POST /api/match should return matches with valid input")
    void matchReturnsMatches() throws Exception {
        mvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"ATGCATGC\",\"pattern\":\"ATGC\",\"algo\":\"KMP\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.matches").value(2))
                .andExpect(jsonPath("$.positions", hasSize(2)))
                .andExpect(jsonPath("$.results[0].name").value("KMP"));
    }

    @Test
    @DisplayName("POST /api/match with ALL should return all algorithms")
    void matchWithAllReturnsAll() throws Exception {
        mvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"ATGCATGC\",\"pattern\":\"ATGC\",\"algo\":\"ALL\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(6)));
    }

    @Test
    @DisplayName("POST /api/match with empty pattern should fail validation")
    void matchWithEmptyPatternFails() throws Exception {
        mvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"ATGC\",\"pattern\":\"\",\"algo\":\"KMP\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ─── POST /api/benchmark ─────────────────────────────────

    @Test
    @DisplayName("POST /api/benchmark should return all algorithm results")
    void benchmarkReturnsAll() throws Exception {
        mvc.perform(post("/api/benchmark")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"ATGCATGCTTACGATGCATCG\",\"pattern\":\"ATGC\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.results", hasSize(6)));
    }

    // ─── POST /api/dna/utils ─────────────────────────────────

    @Test
    @DisplayName("POST /api/dna/utils gc should return GC content")
    void utilsGcContent() throws Exception {
        mvc.perform(post("/api/dna/utils")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"op\":\"gc\",\"seq\":\"ATGC\",\"k\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("50.00%"));
    }

    @Test
    @DisplayName("POST /api/dna/utils complement should work")
    void utilsComplement() throws Exception {
        mvc.perform(post("/api/dna/utils")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"op\":\"complement\",\"seq\":\"ATGC\",\"k\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("TACG"));
    }

    @Test
    @DisplayName("POST /api/dna/utils with unknown op should fail")
    void utilsUnknownOpFails() throws Exception {
        mvc.perform(post("/api/dna/utils")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"op\":\"unknown\",\"seq\":\"ATGC\",\"k\":3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ─── GET /api/health ─────────────────────────────────────

    @Test
    @DisplayName("GET /api/health should return UP")
    void healthReturnsUp() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.version").value("2.0"));
    }

    // ─── GET /api/history ────────────────────────────────────

    @Test
    @DisplayName("GET /api/history should return history list")
    void historyReturnsEntries() throws Exception {
        // First, run a search to populate history
        mvc.perform(post("/api/match")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"ATGCATGC\",\"pattern\":\"ATGC\",\"algo\":\"KMP\"}"));

        mvc.perform(get("/api/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.entries", hasSize(greaterThan(0))));
    }

    // ─── POST /api/upload/fasta ──────────────────────────────

    @Test
    @DisplayName("POST /api/upload/fasta should parse FASTA file")
    void uploadFastaParses() throws Exception {
        String fastaContent = ">Seq1 Test sequence\nATGCATGCTTACG\nGATCGATCG\n>Seq2\nAAAATTTT\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.fasta", "text/plain", fastaContent.getBytes());

        mvc.perform(multipart("/api/upload/fasta").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.sequenceCount").value(2))
                .andExpect(jsonPath("$.sequences[0].header").value("Seq1 Test sequence"));
    }

    @Test
    @DisplayName("POST /api/upload/fasta with empty file should fail")
    void uploadEmptyFastaFails() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.fasta", "text/plain", new byte[0]);

        mvc.perform(multipart("/api/upload/fasta").file(file))
                .andExpect(status().isBadRequest());
    }
    @Test
    void unconfiguredCrossOriginPreflightIsRejected() throws Exception {
        mvc.perform(options("/api/match")
                        .header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void frontendAssetsAreServedFromTheBackendOrigin() throws Exception {
        mvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("GenomeScan")));
        mvc.perform(get("/script.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("const API = '/api'")));
    }

    @Test
    void documentedOpenApiEndpointIsAvailable() throws Exception {
        mvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists());
    }
    @Test
    void sameOriginBrowserPostsWorkWithDefaultCorsPolicy() throws Exception {
        mvc.perform(post("/api/match")
                        .with(request -> { request.setServerName("localhost"); request.setServerPort(3000); return request; })
                        .header("Origin", "http://localhost:3000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"ATGC\",\"pattern\":\"ATGC\",\"algo\":\"KMP\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches").value(1));
    }
}
