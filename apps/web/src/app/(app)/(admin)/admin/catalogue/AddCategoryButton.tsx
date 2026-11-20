"use client";

import type { TreeClass } from "@h2india/core/catalogue/taxonomy";
import { Button, Icon } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddCategoryDialog } from "./CategoryDialogs";

/** Add category on the Categories page; the new category opens on its own page. */
export function AddCategoryButton({ tree, classId }: { tree: TreeClass[]; classId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setOpened((n) => n + 1);
          setOpen(true);
        }}
      >
        <Icon name="plus" size={18} />
        Add category
      </Button>
      {open ? (
        <AddCategoryDialog
          key={opened}
          open
          onOpenChange={setOpen}
          tree={tree}
          initialClassId={classId}
          initialParentId={null}
          onDone={(_text, goTo) => {
            setOpen(false);
            if (goTo) router.push(`/admin/catalogue/categories/${goTo}`);
            else router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
