package com.example.dna.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String[] origins;

    public WebConfig(@Value("${app.cors.allowed-origins:}") String configuredOrigins) {
        origins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
        if (Arrays.stream(origins).anyMatch(s -> s.contains("*"))) {
            throw new IllegalArgumentException("CORS origins must be exact origins, without wildcards");
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // With no configured origins, same-origin requests are the default.
        registry.addMapping("/api/**").allowedOrigins(origins)
                .allowedMethods("GET", "POST", "DELETE").allowedHeaders("Content-Type");
    }
}
