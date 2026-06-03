"use client";

import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Input, Spin, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { fetchStyleDetails, fetchStyles } from "@/services/api/styles";

export default function StyleDetailPage() {
    const { message } = App.useApp();
    const params = useParams();
    const categoryId = Number(params.id);
    const [keyword, setKeyword] = useState("");

    const stylesQuery = useQuery({
        queryKey: ["styles"],
        queryFn: () => fetchStyles({ pageSize: 200 }),
    });

    const detailsQuery = useQuery({
        queryKey: ["style-details", categoryId, keyword],
        queryFn: () => fetchStyleDetails(categoryId, { keyword, pageSize: 200 }),
        enabled: categoryId > 0,
    });

    useEffect(() => {
        if (detailsQuery.isError) {
            message.error(detailsQuery.error instanceof Error ? detailsQuery.error.message : "获取风格详情失败");
        }
    }, [message, detailsQuery.isError, detailsQuery.error]);

    const styles = stylesQuery.data?.items || [];
    const currentStyle = styles.find((s) => s.id === categoryId);
    const details = detailsQuery.data?.items || [];

    const buildStyleRefLink = (detail: { logo: string; name: string; fePrompt?: string }) => {
        const params = new URLSearchParams();
        if (detail.logo) params.set("styleRef", detail.logo);
        if (detail.name) params.set("styleName", detail.name);
        if (detail.fePrompt?.trim()) params.set("prompt", detail.fePrompt.trim());
        return `/image?${params.toString()}`;
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-stone-800 dark:text-stone-100">
            <main className="min-h-0 flex-1 overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-6 py-8 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)]">
                <div className="mx-auto max-w-7xl">
                    <div className="flex items-center gap-3">
                        <Link href="/styles">
                            <Button type="text" icon={<ArrowLeft className="size-4" />} />
                        </Link>
                        <h1 className="text-2xl font-semibold text-stone-950 dark:text-stone-100">{currentStyle?.name || "风格详情"}</h1>
                        <span className="text-sm text-stone-400 dark:text-stone-500">{detailsQuery.data?.total || 0} 个风格</span>
                    </div>

                    <div className="mt-6 w-full max-w-lg">
                        <Input
                            size="large"
                            className="w-full"
                            prefix={<Search className="size-4 text-stone-400" />}
                            value={keyword}
                            placeholder="搜索风格"
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>

                    {detailsQuery.isLoading ? (
                        <div className="flex h-60 items-center justify-center">
                            <Spin />
                        </div>
                    ) : (
                        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {details.map((detail) => (
                                <Card
                                    key={detail.id}
                                    hoverable
                                    className="overflow-hidden"
                                    styles={{ body: { padding: 0 } }}
                                    cover={
                                        <div className="relative">
                                            {detail.logo ? (
                                                <img src={detail.logo} alt={detail.name} className="aspect-[4/3] w-full object-cover" />
                                            ) : (
                                                <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 dark:bg-stone-800">
                                                    <span className="text-2xl font-bold text-stone-300 dark:text-stone-600">{detail.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            {detail.isHot === 1 ? (
                                                <Tag color="red" className="absolute right-2 top-2 m-0 border-0 text-[11px]">
                                                    热门
                                                </Tag>
                                            ) : null}
                                        </div>
                                    }
                                >
                                    <div className="p-4">
                                        <h3 className="line-clamp-1 text-sm font-semibold text-stone-950 dark:text-stone-100">{detail.name}</h3>
                                        {detail.fePrompt ? (
                                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-400">{detail.fePrompt}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 px-4 pb-4">
                                        <Link href={buildStyleRefLink(detail)}>
                                            <Button size="small" icon={<Sparkles className="size-3.5" />}>
                                                生成同款
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                    {details.length === 0 && !detailsQuery.isLoading ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该分类暂无风格" className="py-16" /> : null}
                </div>
            </main>
        </div>
    );
}
