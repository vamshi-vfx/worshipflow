"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TestResult = {
  step: string;
  status: "pending" | "pass" | "fail";
  data?: unknown;
  error?: string;
};

export default function DebugDbTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [projectUrl, setProjectUrl] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      setProjectUrl(url);

      const steps: TestResult[] = [
        { step: "ENV URL", status: "pending", data: url },
        { step: "AUTH USER", status: "pending" },
        { step: "INSERT TEST SONG", status: "pending" },
        { step: "SELECT INSERTED ROW", status: "pending" },
        { step: "SELECT SAME ROW", status: "pending" },
      ];
      setResults(steps);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        steps[1] = {
          step: "AUTH USER",
          status: authError || !user ? "fail" : "pass",
          data: user ? { id: user.id, email: user.email } : null,
          error: authError?.message || (!user ? "No user" : undefined),
        };
        setResults([...steps]);

        if (!user) {
          steps[2] = { step: "INSERT TEST SONG", status: "fail", error: "Authenticated user not found. Please sign in again." };
          steps[3] = { step: "SELECT INSERTED ROW", status: "fail", error: "Skipped" };
          steps[4] = { step: "SELECT SAME ROW", status: "fail", error: "Skipped" };
          setResults([...steps]);
          return;
        }

        const testTitle = `WORSHIPFLOW_DB_TEST_${Date.now()}`;
        const payload = {
          title: testTitle,
          slug: testTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          language: "english",
          category: "worship",
          favorite: false,
          created_by: user.id,
        };

        const { data: insertData, error: insertError } = await supabase
          .from("songs")
          .insert([payload])
          .select()
          .single();

        steps[2] = {
          step: "INSERT TEST SONG",
          status: insertError ? "fail" : "pass",
          data: insertData,
          error: insertError?.message,
        };
        setResults([...steps]);

        if (!insertData || insertError) {
          steps[3] = { step: "SELECT INSERTED ROW", status: "fail", error: "Skipped due to insert failure" };
          steps[4] = { step: "SELECT SAME ROW", status: "fail", error: "Skipped due to insert failure" };
          setResults([...steps]);
          return;
        }

        const { data: selectData, error: selectError } = await supabase
          .from("songs")
          .select("*")
          .eq("id", insertData.id)
          .single();

        steps[3] = {
          step: "SELECT INSERTED ROW",
          status: selectError ? "fail" : "pass",
          data: selectData,
          error: selectError?.message,
        };
        setResults([...steps]);

        const { data: selectSame, error: selectSameError } = await supabase
          .from("songs")
          .select("*")
          .eq("title", testTitle)
          .single();

        steps[4] = {
          step: "SELECT SAME ROW",
          status: selectSameError ? "fail" : "pass",
          data: selectSame,
          error: selectSameError?.message,
        };
        setResults([...steps]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        steps[0] = { step: "ENV URL", status: "fail", data: projectUrl, error: msg };
        setResults([...steps]);
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-brand-darker text-white p-8">
      <h1 className="text-2xl font-bold mb-4">WORSHIPFLOW DB DIAGNOSTIC</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Supabase URL hostname: {projectUrl ? new URL(projectUrl).hostname : "MISSING"}
      </p>
      <div className="space-y-4">
        {results.map((r) => (
          <div key={r.step} className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold">{r.step}</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  r.status === "pass"
                    ? "bg-green-500/20 text-green-400"
                    : r.status === "fail"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-muted-foreground"
                }`}
              >
                {r.status.toUpperCase()}
              </span>
            </div>
            {r.data !== undefined && (
              <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-60">
                {JSON.stringify(r.data, null, 2)}
              </pre>
            )}
            {r.error && (
              <p className="text-xs text-red-400 mt-2">ERROR: {r.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
