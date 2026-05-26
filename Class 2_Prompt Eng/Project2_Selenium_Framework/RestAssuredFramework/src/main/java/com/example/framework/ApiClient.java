package com.example.framework;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

public class ApiClient {
    public ApiClient(String baseUri) {
        RestAssured.baseURI = baseUri;
    }

    public Response post(String path, String body) {
        try {
            return RestAssured.given()
                    .contentType(ContentType.JSON)
                    .body(body)
                    .post(path)
                    .andReturn();
        } catch (Exception e) {
            throw new RuntimeException("POST request failed: " + e.getMessage(), e);
        }
    }

    public Response get(String path) {
        try {
            return RestAssured.given()
                    .contentType(ContentType.JSON)
                    .get(path)
                    .andReturn();
        } catch (Exception e) {
            throw new RuntimeException("GET request failed: " + e.getMessage(), e);
        }
    }
}
