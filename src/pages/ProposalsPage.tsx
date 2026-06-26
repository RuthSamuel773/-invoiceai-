import { useState, useEffect } from "react";
import type { Proposal } from "../types";
import { authFetch, formatDate } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Copy, ChevronDown, ChevronUp } from "lucide-react";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [projectDescription, setProjectDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchProposals = async () => {
    try {
      const res = await authFetch("/api/proposals");
      if (res.ok) setProposals(await res.json());
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchProposals(); }, []);

  const handleGenerate = async () => {
    if (!projectDescription.trim()) { toast.error("Please describe your project first"); return; }
    setGenerating(true);
    try {
      const res = await authFetch("/api/proposals", {
        method: "POST",
        body: JSON.stringify({ project_description: projectDescription }),
      });
      if (!res.ok) { toast.error("Failed to generate proposal"); return; }
      toast.success("Proposal generated!");
      setProjectDescription("");
      fetchProposals();
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const toggleExpanded = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Proposal Writer</h1>
        <p className="text-muted-foreground mt-1">Describe your project and Gemini writes a professional proposal in seconds</p>
      </div>

      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate New Proposal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              placeholder="e.g. Build a custom e-commerce website for a boutique clothing brand. Needs product catalog, shopping cart, Stripe payments, and admin dashboard. Timeline: 6 weeks."
              rows={6}
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              disabled={generating}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !projectDescription.trim()}>
            {generating ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Proposal
              </>
            )}
          </Button>
          {generating && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Proposals */}
      {loadingList ? (
        <Skeleton className="h-40 w-full" />
      ) : proposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Previous Proposals</h2>
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardHeader className="cursor-pointer" onClick={() => toggleExpanded(p.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-foreground truncate">{p.project_description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => { e.stopPropagation(); copyText(p.generated_content); }}
                      title="Copy proposal"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {expanded[p.id] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {expanded[p.id] && (
                <CardContent>
                  <div className="bg-muted rounded-md p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {p.generated_content}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loadingList && proposals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No proposals yet. Generate your first one above.</p>
      )}
    </div>
  );
}
