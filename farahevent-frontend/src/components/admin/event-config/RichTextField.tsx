'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Éditeur rich text léger (Tiptap) — gras/italique/listes/liens.
 * HTML restreint, aligné sur le contrat public (description). SSR-safe
 * (immediatelyRender false).
 */
export function RichTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noreferrer' } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] px-3 py-2 text-sm leading-relaxed outline-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Resynchronise si la valeur externe change (ex. bascule de langue).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-[160px] rounded-md border border-input bg-background" />;
  }

  const btn = (active: boolean) =>
    cn(
      'flex h-8 w-8 items-center justify-center rounded transition-colors',
      active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Lien (URL) :', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex items-center gap-0.5 border-b border-border p-1">
        <button type="button" title="Gras" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" title="Lien" onClick={setLink} className={btn(editor.isActive('link'))}>
          <Link2 className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
