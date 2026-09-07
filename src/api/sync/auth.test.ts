jest.mock("./supabaseClient", () => ({
  getSupabaseClient: jest.fn(),
}));

import { getSupabaseClient } from "./supabaseClient";
import { signUp, signIn, signOut, getSession } from "./auth";

const mockClient = (overrides: Record<string, jest.Mock>) => {
  (getSupabaseClient as jest.Mock).mockReturnValue({ auth: overrides });
};

describe("auth", () => {
  test("signUp returns no error on success", async () => {
    mockClient({ signUp: jest.fn().mockResolvedValue({ data: {}, error: null }) });
    expect(await signUp("a@b.com", "password123")).toEqual({ error: null });
  });

  test("signUp surfaces the Supabase error message", async () => {
    mockClient({ signUp: jest.fn().mockResolvedValue({ data: null, error: { message: "Email already registered" } }) });
    expect(await signUp("a@b.com", "password123")).toEqual({ error: "Email already registered" });
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
