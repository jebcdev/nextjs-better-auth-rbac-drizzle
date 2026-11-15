import {
    MetadataGeneratorProps,
    generateAsyncTitle,
    generateAsyncDescription,
} from "@/lib/seo";
import type { Metadata } from "next";

const pageData: MetadataGeneratorProps = {
    title: "Panel",
    description: "Panel del Sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(
            pageData.description,
        ),
    };
}

export default function PrivateDashboardPage() {
    return (
        <>
            <main>
                <h1></h1>
            </main>
        </>
    );
}
