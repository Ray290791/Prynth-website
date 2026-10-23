import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFaqsAdmin, createFaq, updateFaq, deleteFaq, reorderFaqs } from "@/lib/faq-fns";
import { Plus, Edit2, Trash2, X, HelpCircle } from "lucide-react";

export function FaqsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqsAdmin"],
    queryFn: () => getFaqsAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      await createFaq({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ created");
      setIsAdding(false);
      setQuestion("");
      setAnswer("");
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; question: string; answer: string }) => {
      await updateFaq({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ updated");
      setEditingId(null);
      setQuestion("");
      setAnswer("");
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteFaq({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ deleted");
    },
    onError: (err) => toast.error(err.message)
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await reorderFaqs({ data: { orderedIds } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    }
  });

  const moveFaq = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === faqs.length - 1)
    ) return;
    
    const newFaqs = [...faqs];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[swapIndex];
    newFaqs[swapIndex] = temp;
    
    reorderMutation.mutate(newFaqs.map(f => f.id));
  };

  const startEdit = (faq: any) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsAdding(false);
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Loading FAQs...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">FAQs</h2>
          <p className="text-muted mt-1 text-sm">Manage the Frequently Asked Questions displayed on the site.</p>
        </div>
        {!isAdding && editingId === null && (
          <button
            onClick={() => { setIsAdding(true); setQuestion(""); setAnswer(""); }}
            className="px-4 py-2 rounded-lg bg-ink text-bg hover:opacity-90 text-sm font-medium"
          >
            Add New FAQ
          </button>
        )}
      </div>

      {(isAdding || editingId !== null) && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{isAdding ? "Add FAQ" : "Edit FAQ"}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded border border-border bg-surface-2 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                className="w-full rounded border border-border bg-surface-2 p-2 text-sm resize-y"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (isAdding) {
                    createMutation.mutate({ question, answer });
                  } else if (editingId !== null) {
                    updateMutation.mutate({ id: editingId, question, answer });
                  }
                }}
                disabled={!question || !answer || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((faq: any, index: number) => (
          <div key={faq.id} className="bg-surface border border-border rounded-xl p-4 flex gap-4 items-start group transition-colors hover:bg-surface-2/30">
            <div className="flex flex-col gap-1 shrink-0 pt-1">
              <button 
                onClick={() => moveFaq(index, 'up')}
                disabled={index === 0 || reorderMutation.isPending}
                className="text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors"
              >
                ↑
              </button>
              <button 
                onClick={() => moveFaq(index, 'down')}
                disabled={index === faqs.length - 1 || reorderMutation.isPending}
                className="text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors"
              >
                ↓
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-lg mb-1">{faq.question}</h4>
              <p className="text-sm text-muted">{faq.answer}</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEdit(faq)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this FAQ?")) {
                    deleteMutation.mutate(faq.id);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && !isLoading && (
          <div className="text-center p-8 text-muted border border-dashed border-border rounded-xl">
            No FAQs found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

