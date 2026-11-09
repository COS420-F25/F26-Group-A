import React from "react";
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { signInWithEmailAndPassword } from "firebase/auth";
import FirebaseAuth from "./FirebaseAuth";
import { describe } from "astro:schema";

jest.mock("firebase/auth", () => ({
    signInWithEmailAndPassword: jest.fn(),
}))

describe("FirebaseAuth", () => {
    test("Firebase check when user logs in", async () => {
        signInWithEmailAndPassword.mockResolvedValueOnce({
            user: { uid: "123" }
        })
    })
})