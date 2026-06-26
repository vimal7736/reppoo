import type { Tier } from "@/types";

export interface PlanDefinition {
  id: Tier;
  name: string;
  price: number;
  vatRate?: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "1 utility bill/month",
      "Basic dashboard",
      "1 PDF SECR report/month",
      "1 user seat",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 24,
    vatRate: 0.2,
    features: [
      "50 bills/month (all types)",
      "Full dashboard & charts",
      "20 AI-powered insights/month",
      "5 PDF SECR reports/month",
      "3 user seats",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    vatRate: 0.2,
    features: [
      "500 bills/month",
      "100 AI-powered insights/month",
      "Unlimited PDF SECR reports",
      "8 user seats",
      "Priority support",
    ],
  },
];
