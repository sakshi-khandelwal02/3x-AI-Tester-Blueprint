package com.example.tests;

import com.example.framework.ApiClient;
import com.example.framework.JsonUtils;
import com.example.pages.LoginApi;
import io.restassured.response.Response;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class LoginInvalidTest {
    private ApiClient client;
    private LoginApi loginApi;

    @BeforeTest
    public void setup() {
        client = new ApiClient("https://login.salesforce.com");
        loginApi = new LoginApi(client, "/services/oauth2/token");
    }

    @Test
    public void invalidLogin() {
        try {
            Response res = loginApi.loginWithJsonFile("src/test/resources/json/login_invalid.json");
            Assert.assertTrue(res.getStatusCode() == 400 || res.getStatusCode() == 401);
            String expected = JsonUtils.readJson("src/test/resources/json/expected_login_failure.json");
            boolean eq = JsonUtils.jsonEquals(expected, res.getBody().asString());
            Assert.assertTrue(eq, "Failure response JSON does not match expected");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @AfterTest
    public void teardown() {
    }
}
