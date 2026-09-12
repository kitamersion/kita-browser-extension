jest.mock("./supabaseClient", () => ({
  getSupabaseClient: jest.fn(),
}));

import { getSupabaseClient } from "./supabaseClient";
import { signUp, signIn, signOut, getSession, setSession, EMAIL_CONFIRM_REDIRECT_URL } from "./auth";

const mockClient = (overrides: Record<string, jest.Mock>) => {
  (getSupabaseClient as jest.Mock).mockReturnValue({ auth: overrides });
};

describe("auth", () => {
  test("signUp reports no confirmation needed when a session is created", async () => {
    mockClient({ signUp: jest.fn().mockResolvedValue({ data: { session: { access_token: "t" } }, error: null }) });
    expect(await signUp("a@b.com", "password123")).toEqual({ error: null, needsEmailConfirmation: false });
  });

  test("signUp reports confirmation needed when no session is created", async () => {
    mockClient({ signUp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) });
    expect(await signUp("a@b.com", "password123")).toEqual({ error: null, needsEmailConfirmation: true });
  });

  test("signUp surfaces the Supabase error message", async () => {
    mockClient({ signUp: jest.fn().mockResolvedValue({ data: null, error: { message: "Email already registered" } }) });
    expect(await signUp("a@b.com", "password123")).toEqual({ error: "Email already registered", needsEmailConfirmation: false });
  });

  test("signUp sends the confirmation email to the kita-blog bridge page", async () => {
    const signUpMock = jest.fn().mockResolvedValue({ data: { session: null }, error: null });
    mockClient({ signUp: signUpMock });
    await signUp("a@b.com", "password123");
    expect(signUpMock).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123",
      options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL },
    });
  });

  test("setSession returns no error on success", async () => {
    mockClient({ setSession: jest.fn().mockResolvedValue({ data: {}, error: null }) });
    expect(await setSession("access-token", "refresh-token")).toEqual({ error: null });
  });

  test("setSession surfaces the Supabase error message", async () => {
    mockClient({ setSession: jest.fn().mockResolvedValue({ data: null, error: { message: "Invalid refresh token" } }) });
    expect(await setSession("access-token", "bad-refresh-token")).toEqual({ error: "Invalid refresh token" });
  });

  test("signIn returns no error on success", async () => {
    mockClient({ signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }) });
    expect(await signIn("a@b.com", "password123")).toEqual({ error: null });
  });

  test("getSession returns null fields when there is no session", async () => {
    mockClient({ getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) });
    expect(await getSession()).toEqual({ email: null, userId: null });
  });

  test("getSession returns the signed-in user's email and id", async () => {
    mockClient({
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1", email: "a@b.com" } } },
        error: null,
      }),
    });
    expect(await getSession()).toEqual({ email: "a@b.com", userId: "user-1" });
  });

  test("signOut calls the client's signOut", async () => {
    const signOutMock = jest.fn().mockResolvedValue({ error: null });
    mockClient({ signOut: signOutMock });
    await signOut();
    expect(signOutMock).toHaveBeenCalled();
  });
});
