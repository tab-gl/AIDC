import { useEffect, useState, type FormEvent } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

type Props = { open: boolean; busy: boolean; error: string | null; onClose: () => void; onCreate: (input: { name: string; description: string; origin_url?: string }) => Promise<void> };

export function CreateApplicationModal({ open, busy, error, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  useEffect(() => { if (open) { setName(""); setDescription(""); setOriginUrl(""); } }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    await onCreate({ name: name.trim(), description: description.trim(), origin_url: originUrl.trim() || undefined });
  };

  return <Dialog className="sheet-drawer" isOpen={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }} width={520} purpose="form" padding={0}>
    <DialogHeader title="Create an application" subtitle="Creates a real OAuth/OIDC client on the server. Client IDs are never fabricated locally." onOpenChange={(next) => { if (!next && !busy) onClose(); }} />
    <form onSubmit={submit}>
      <VStack gap={4} padding={4}>
        <TextInput label="Application name" isRequired value={name} onChange={setName} placeholder="My application" hasAutoFocus />
        <TextArea label="Description" isOptional value={description} onChange={setDescription} placeholder="What this application is used for" description={`${description.length}/2000`} />
        <TextInput label="Origin URL" isOptional type="url" inputMode="url" value={originUrl} onChange={setOriginUrl} placeholder="https://example.com"
          description="The public base URL. Configure exact redirect URIs in the application's settings after creation." />
        {error && <Banner status="error" title="Could not create the application" description={error} />}
        <HStack gap={2} hAlign="end">
          <Button label="Cancel" onClick={onClose} isDisabled={busy} />
          <Button label="Create application" type="submit" variant="primary" isLoading={busy} isDisabled={!name.trim()} />
        </HStack>
      </VStack>
    </form>
  </Dialog>;
}
