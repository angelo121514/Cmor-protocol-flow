import { describe, expect, it } from "vitest";
import { APP_CONFIG, type PlanId } from "../../config/config";

describe("U13 — catálogo comercial de planes", () => {
  it("mantiene prueba, Básico, Pro y el plan de por vida", () => {
    const planIds = Object.keys(APP_CONFIG.plans).sort() as PlanId[];

    expect(planIds).toEqual(["free_trial", "lifetime", "pro", "starter"]);
    expect(APP_CONFIG.plans.free_trial.price).toBe(0);
    expect(APP_CONFIG.plans.starter.name).toBe("Básico");
    expect(APP_CONFIG.plans.pro.billing_type).toBe("recurring");
  });

  it("configura el plan de por vida como pago único", () => {
    const lifetime = APP_CONFIG.plans.lifetime;

    expect(lifetime).toMatchObject({
      name: "De por vida",
      price: 1900000,
      duration: "pago único",
      billing_type: "one_time",
    });
  });
});
