import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import {
  createMockUser,
  createUserWithEmailAndPassword,
  resetMockFirebase,
  sendPasswordResetEmail,
  setMockAuthUser,
  setMockUserProfile,
  signInWithEmailAndPassword,
} from "./__mocks__/firebase";

vi.mock("../firebase", () => import("./__mocks__/firebase"));
vi.mock("firebase/auth", () => import("./__mocks__/firebase"));
vi.mock("firebase/firestore", () => import("./__mocks__/firebase"));
vi.mock("firebase/functions", () => import("./__mocks__/firebase"));

const fillLoginForm = async (user, { email = "test@example.com", password = "password" } = {}) => {
  await user.type(screen.getByPlaceholderText(/email/i), email);
  await user.type(screen.getByPlaceholderText(/password/i), password);
};

describe("App authentication flows", () => {
  beforeEach(() => {
    resetMockFirebase();
  });

  it("logs in and shows the dashboard tabs", async () => {
    setMockUserProfile("mock-user", {
      churchId: "church-123",
      churchName: "Grace Chapel",
      role: "admin",
    });

    const user = userEvent.setup();
    render(<App />);

    await fillLoginForm(user);
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled());

    expect(
      await screen.findByRole("button", { name: /members \(crm\)/i })
    ).toBeInTheDocument();
  });

  it("registers a new user and surfaces verification guidance", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /register/i }));
    await fillLoginForm(user, {
      email: "new.user@example.com",
      password: "longpassword",
    });

    await user.type(screen.getByPlaceholderText(/church name/i), "Hope Church");
    await user.type(
      screen.getByPlaceholderText(/church address/i),
      "123 Faith Road"
    );
    await user.type(screen.getByPlaceholderText(/city/i), "Accra");
    await user.type(screen.getByPlaceholderText(/church phone number/i), "555-1234");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(createUserWithEmailAndPassword).toHaveBeenCalled());

    expect(
      await screen.findByText(/verification email sent to new\.user@example\.com/i)
    ).toBeInTheDocument();
  });

  it("handles password reset validation and success states", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(
      screen.getByText(/enter your email to reset your password/i)
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/email/i));
    await user.type(screen.getByPlaceholderText(/email/i), "recover@example.com");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalled());
    expect(
      await screen.findByText(/password reset email sent\. check your inbox\./i)
    ).toBeInTheDocument();
  });
});

describe("Dashboard interactions", () => {
  beforeEach(() => {
    resetMockFirebase();
  });

  it("switches dashboard tabs after login", async () => {
    const loggedInUser = createMockUser({
      uid: "tab-user",
      email: "tab@example.com",
    });
    setMockAuthUser(loggedInUser);
    setMockUserProfile("tab-user", {
      churchId: "church-999",
      churchName: "Tab Church",
      role: "admin",
    });

    render(<App />);

    const membersTab = await screen.findByRole("button", { name: /members \(crm\)/i });
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();

    await userEvent.click(membersTab);
    expect(
      await screen.findByText(/manage your church members, visitors, and follow-ups/i)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sermons/i }));
    expect(
      await screen.findByText(/log sermons and series so your team can quickly see/i)
    ).toBeInTheDocument();
  });
});
