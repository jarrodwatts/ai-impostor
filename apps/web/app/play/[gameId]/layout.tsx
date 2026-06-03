/**
 * /play/[gameId] layout — mounts the socket provider + HUD shell around the
 * PhaseRouter page. Next 16: params is a Promise, awaited in this async server
 * component and forwarded to the client shell.
 */
import type { ReactNode } from "react";
import { PlayShell } from "./play-shell";

export default async function PlayLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <PlayShell gameId={gameId}>{children}</PlayShell>;
}
