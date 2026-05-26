package com.example.pages;

import com.example.framework.ApiClient;
import com.example.framework.JsonUtils;
import io.restassured.response.Response;

import java.io.IOException;

public class LoginApi {
    private final ApiClient client;
    private final String loginPath;

    public LoginApi(ApiClient client, String loginPath) {
        this.client = client;
        this.loginPath = loginPath;
    }

    public Response loginWithJsonFile(String jsonRelativePath) {
        try {
            String body = JsonUtils.readJson(jsonRelativePath);
            return client.post(loginPath, body);
        } catch (IOException e) {
            throw new RuntimeException("Unable to read JSON template: " + jsonRelativePath, e);
        } catch (Exception e) {
            throw new RuntimeException("Login API call failed", e);
        }
    }
}
