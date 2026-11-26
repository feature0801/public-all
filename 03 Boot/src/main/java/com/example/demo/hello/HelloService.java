package com.example.demo.hello;

import org.springframework.stereotype.Service;

@Service
public class HelloService {

    public HelloResponse greet(String name) {
        return new HelloResponse("Hello, " + name + "!");
    }
}
