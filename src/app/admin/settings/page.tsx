import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">Settings</h2>
        <p className="text-sm text-neutral-500">
          Commission tiers, bonus thresholds, and system configuration
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Accelerator tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded-md bg-neutral-50 px-3 py-2">
                <span className="text-neutral-600">Starter (1–19 clients)</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex justify-between rounded-md bg-neutral-50 px-3 py-2">
                <span className="text-neutral-600">Proven (20–49 clients)</span>
                <span className="font-medium">30%</span>
              </div>
              <div className="flex justify-between rounded-md bg-neutral-50 px-3 py-2">
                <span className="text-neutral-600">Elite (50+ clients)</span>
                <span className="font-medium">35%</span>
              </div>
              <p className="text-xs text-neutral-400">
                Verification residual is always 12% regardless of tier.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Quarterly bonus thresholds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-neutral-700">Acquisition</p>
                <div className="space-y-1 text-neutral-600">
                  <p>1–3 clients: $500 · 4–6: $1,500 · 7–10: $3,000 · 11+: $5,000</p>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-neutral-700">Verification volume</p>
                <div className="space-y-1 text-neutral-600">
                  <p>1–300: $500 · 301–800: $1,500 · 801–2,000: $3,500 · 2,001+: $5,000</p>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-neutral-700">Client retention</p>
                <div className="space-y-1 text-neutral-600">
                  <p>80–89%: $500 · 90–94%: $1,000 · 95%+: $2,000</p>
                </div>
              </div>
              <p className="text-xs text-neutral-400">
                Max quarterly bonus: $12,000
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            System info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-neutral-600">
            <div className="flex justify-between">
              <span>Commission window</span>
              <span className="font-medium">12 months from sign date</span>
            </div>
            <div className="flex justify-between">
              <span>Currency</span>
              <span className="font-medium">USD only</span>
            </div>
            <div className="flex justify-between">
              <span>Timezone</span>
              <span className="font-medium">America/New_York</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
