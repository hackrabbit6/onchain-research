import { describe, expect, test } from "bun:test";
import { buildScanReport, isKnownInfrastructure } from "../src/cluster/analysis/report";
import type { Holder, TokenDataset } from "../src/cluster/domain/types";
import { FixtureProvider } from "../src/cluster/providers/fixture";

const TOKEN = "0xccfb3e8b1772bd3a9fc62deaf75127adad597777";

describe("cluster scoring", () => {
  test("groups same-funder wallets with near buy windows and similar sizing", async () => {
    const provider = new FixtureProvider();
    const dataset = await provider.getTokenDataset({ chain: "bsc", token: TOKEN, top: 50 });
    const report = buildScanReport(dataset);

    expect(report.clusters).toHaveLength(1);
    expect(report.clusters[0].confidence).toBe("high");
    expect(report.clusters[0].addresses).toContain("0x1111111111111111111111111111111111111111");
    expect(report.clusters[0].addresses).toContain("0x2222222222222222222222222222222222222222");
    expect(report.clusters[0].addresses).toContain("0x3333333333333333333333333333333333333333");
    expect(report.clusters[0].evidence.some((item) => item.rule === "same_funding_source")).toBe(true);
    expect(report.clusters[0].evidence.flatMap((item) => item.txHashes)).toContain("0xbuy-a");
  });

  test("filters known infrastructure from holder concentration and cluster scoring", async () => {
    const provider = new FixtureProvider();
    const dataset = await provider.getTokenDataset({ chain: "bsc", token: TOKEN, top: 50 });
    const report = buildScanReport(dataset);

    expect(report.filteredHolders.some((holder) => holder.label?.includes("Binance"))).toBe(false);
    expect(report.filteredHolders.some((holder) => holder.label?.includes("pool"))).toBe(false);
    expect(report.clusters.flatMap((cluster) => cluster.addresses)).not.toContain(
      "0x8894e0a0c962cb723c1976a4421c95949be2d4e3"
    );
  });

  test("detects infrastructure-like holder labels", () => {
    const holder: Holder = {
      address: "0x9999999999999999999999999999999999999999",
      balance: 1,
      percentage: 1,
      label: "Some CEX hot wallet"
    };

    expect(isKnownInfrastructure(holder)).toBe(true);
  });

  test("does not generate clusters when evidence is below threshold", () => {
    const dataset: TokenDataset = {
      metadata: {
        chain: "bsc",
        address: TOKEN,
        symbol: "LOW",
        name: "Low Evidence",
        decimals: 18,
        totalSupply: 1000
      },
      holders: [
        { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", balance: 50, percentage: 5 },
        { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", balance: 40, percentage: 4 }
      ],
      walletSamples: [
        {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          baseBalance: 1,
          holdings: [],
          events: [
            {
              txHash: "0xonly-router-a",
              wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              timestamp: "2026-06-02T00:00:00.000Z",
              type: "buy",
              amountBase: 1,
              router: "0xrouter"
            }
          ],
          commonRouters: ["0xrouter"],
          warnings: []
        },
        {
          address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          baseBalance: 1,
          holdings: [],
          events: [
            {
              txHash: "0xonly-router-b",
              wallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              timestamp: "2026-06-02T03:00:00.000Z",
              type: "buy",
              amountBase: 9,
              router: "0xrouter"
            }
          ],
          commonRouters: ["0xrouter"],
          warnings: []
        }
      ]
    };

    expect(buildScanReport(dataset).clusters).toHaveLength(0);
  });
});
