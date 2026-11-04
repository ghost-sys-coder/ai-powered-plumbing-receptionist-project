import { describe, expect, it } from "vitest";
import { homeForRole, isStaffRole } from "./roles";

describe("roles", () => {
  it("treats platform admins and agency staff as staff", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("agency")).toBe(true);
  });

  it("treats clients, missing and unknown roles as non-staff", () => {
    expect(isStaffRole("client")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole("Admin")).toBe(false);
  });

  it("routes staff to the admin console and everyone else to the dashboard", () => {
    expect(homeForRole("admin")).toBe("/admin");
    expect(homeForRole("agency")).toBe("/admin");
    expect(homeForRole("client")).toBe("/dashboard");
    expect(homeForRole(undefined)).toBe("/dashboard");
  });
});
