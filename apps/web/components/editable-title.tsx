"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { renameTodoList } from "@/app/actions/todo-list";

interface Props {
  listId: string;
  initialTitle: string;
  href?: string;
  className?: string;
  readOnly?: boolean;
}

export function EditableTitle({ listId, initialTitle, href, className, readOnly }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing(e: React.MouseEvent) {
    if (readOnly) return;
    e.preventDefault();
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }
    if (trimmed !== initialTitle) {
      await renameTodoList(listId, trimmed);
    }
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setTitle(initialTitle);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        className="flex-1 rounded border border-indigo-300 px-1.5 py-0.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        autoFocus
      />
    );
  }

  const textClass = className ?? "font-medium text-gray-800";

  if (href) {
    return (
      <Link
        href={href}
        onDoubleClick={readOnly ? undefined : startEditing}
        title={readOnly ? undefined : "Double-clic pour modifier"}
        className={`${textClass} hover:underline underline-offset-2`}
      >
        {title}
      </Link>
    );
  }

  return (
    <span
      onDoubleClick={readOnly ? undefined : startEditing}
      title={readOnly ? undefined : "Double-clic pour modifier"}
      className={`${readOnly ? "" : "cursor-text select-none"} ${textClass}`}
    >
      {title}
    </span>
  );
}
