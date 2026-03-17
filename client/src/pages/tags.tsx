import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tag } from "@shared/schema";
import { Plus, Trash2, Tags as TagsIcon } from "lucide-react";
import { format } from "date-fns";

const addTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
});

type AddTagFormData = z.infer<typeof addTagSchema>;

export default function TagsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const form = useForm<AddTagFormData>({
    resolver: zodResolver(addTagSchema),
    defaultValues: {
      name: "",
    },
  });

  const addTag = useMutation({
    mutationFn: async (data: AddTagFormData) => {
      const res = await apiRequest("POST", "/api/tags", { name: data.name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag created" });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create tag",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag deleted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete tag",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <AppLayout title="Tags">
      <div className="space-y-6" data-testid="page-tags">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-muted-foreground">{tags?.length ?? 0} tags</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TagsIcon className="h-4 w-4" />
              Create Tag
            </CardTitle>
            <CardDescription>
              Tags help you categorize and filter your trades for better analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => addTag.mutate(data))} className="flex gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1 max-w-xs">
                      <FormControl>
                        <Input placeholder="e.g., Earnings play, Momentum..." data-testid="input-tag-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addTag.isPending} data-testid="button-add-tag">
                  <Plus className="h-4 w-4 mr-2" />
                  {addTag.isPending ? "Creating..." : "Create"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : tags && tags.length > 0 ? (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                    data-testid={`row-tag-${tag.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-sm">
                        {tag.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {format(new Date(tag.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete tag "${tag.name}"? This will remove it from all trades.`)) {
                          deleteTag.mutate(tag.id);
                        }
                      }}
                      disabled={deleteTag.isPending}
                      data-testid={`button-delete-${tag.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TagsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tags yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create tags to categorize your trades
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
