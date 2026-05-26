package com.example.framework;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class JsonUtils {
    public static String readJson(String relativePathFromProjectRoot) throws IOException {
        Path p = Path.of(System.getProperty("user.dir"), relativePathFromProjectRoot);
        return Files.readString(p);
    }

    public static boolean jsonEquals(String expectedJson, String actualJson) {
        JsonElement e1 = JsonParser.parseString(expectedJson);
        JsonElement e2 = JsonParser.parseString(actualJson);
        return e1.equals(e2);
    }
}
