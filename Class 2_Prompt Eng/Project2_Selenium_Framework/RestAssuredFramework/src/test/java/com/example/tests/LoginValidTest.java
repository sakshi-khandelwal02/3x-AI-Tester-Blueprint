package com.example.tests;

import com.example.framework.ApiClient;
import com.example.framework.JsonUtils;
import com.example.pages.LoginApi;
import io.restassured.response.Response;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class LoginValidTest {
    private ApiClient client;
    private LoginApi loginApi;

    @BeforeTest
    public void setup() {
        client = new ApiClient("https://login.salesforce.com");
        loginApi = new LoginApi(client, "/services/oauth2/token");
    }

    @Test
    public void validLogin() {
        try {
            Response res = loginApi.loginWithJsonFile("src/test/resources/json/login_valid.json");
            Assert.assertTrue(res.getStatusCode() == 200 || res.getStatusCode() == 201);
            String expected = JsonUtils.readJson("src/test/resources/json/expected_login_success.json");
            boolean eq = JsonUtils.jsonEquals(expected, res.getBody().asString());
            Assert.assertTrue(eq, "Response JSON does not match expected");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @AfterTest
    public void teardown() {
    }
}
