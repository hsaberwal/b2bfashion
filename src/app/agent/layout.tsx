import { AgentShell } from "@/components/agent/AgentShell";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <AgentShell>{children}</AgentShell>;
}
