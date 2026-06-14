import ManholeDashboard from "@/components/admin/ManholeDashboard";

const BRANCH_MAP: Record<string, string> = {
  gyeongnam: "경남지사",
  "west-busan": "서부산지사",
  "east-busan": "동부산지사",
  daegu: "대구지사",
};

export function generateStaticParams() {
  return Object.keys(BRANCH_MAP).map((branch) => ({ branch }));
}

export default async function ManholeBranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const label = BRANCH_MAP[branch] ?? branch;
  return <ManholeDashboard branch={branch} branchLabel={label} />;
}
