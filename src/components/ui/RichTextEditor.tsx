import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, List, ListOrdered, ImagePlus, SquarePilcrow,
} from 'lucide-react';
import { uploadSprintGoalImage } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from './Toast';

function setBodyParagraph(editor: Editor) {
  let guard = 0;
  while (editor.isActive('listItem') && guard < 24) {
    editor.chain().focus().liftListItem('listItem').run();
    guard += 1;
  }
  editor.chain().focus().setParagraph().run();
}

type RichTextEditorProps = {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  /** Required for image uploads (path scoped under project). */
  projectId: string;
  disabled?: boolean;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  label,
  error,
  hint,
  value,
  onChangeHtml,
  placeholder = '',
  projectId,
  disabled = false,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md border border-base my-2',
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChangeHtml(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[120px] max-h-64 overflow-y-auto px-3 py-2.5 text-sm text-hi outline-none',
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const runImagePick = useCallback(() => {
    if (!projectId) {
      toast.error('Select a project first', 'Choose a project before attaching images.');
      return;
    }
    fileRef.current?.click();
  }, [projectId]);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file', 'Please choose an image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Images must be 5MB or smaller.');
        return;
      }
      try {
        const src = await uploadSprintGoalImage(projectId, file);
        editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run();
      } catch (err) {
        toast.error(
          'Upload failed',
          err instanceof Error ? err.message : 'Could not upload image.'
        );
      }
    },
    [editor, projectId]
  );

  if (!editor) {
    return (
      <div className="w-full">
        {label && (
          <span className="block text-sm font-medium text-body mb-1.5">{label}</span>
        )}
        <div className="min-h-[120px] rounded-lg border border-base bg-inset animate-pulse" />
      </div>
    );
  }

  const barBtn = (active: boolean) =>
    cn(
      'p-1.5 rounded-md transition-colors',
      active ? 'bg-slate-200 text-hi' : 'text-dim hover:bg-inset',
      disabled && 'opacity-50 pointer-events-none'
    );

  return (
    <div className="w-full rich-text-editor">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-body mb-1.5">
          {label}
        </label>
      )}
      <div
        className={cn(
          'rounded-lg border bg-surface transition-colors',
          error ? 'border-red-400 ring-2 ring-red-100' : 'border-base hover:border-base',
          'focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent'
        )}
      >
        <div
          className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-subtle bg-inset/80 rounded-t-lg"
          role="toolbar"
          aria-label="Text formatting"
        >
          <button
            type="button"
            className={barBtn(editor.isActive('bold'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-pressed={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
            <span className="sr-only">Bold</span>
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive('italic'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-pressed={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
            <span className="sr-only">Italic</span>
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive('paragraph') && !editor.isActive('bulletList') && !editor.isActive('orderedList'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBodyParagraph(editor)}
            title="Paragraph"
          >
            <SquarePilcrow className="h-4 w-4" />
            <span className="sr-only">Paragraph</span>
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive('bulletList'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-pressed={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
            <span className="sr-only">Bullet list</span>
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive('orderedList'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            aria-pressed={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
            <span className="sr-only">Numbered list</span>
          </button>
          <button
            type="button"
            className={barBtn(false)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={runImagePick}
            disabled={disabled || !projectId}
            title={projectId ? 'Insert image' : 'Select a project to attach images'}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="sr-only">Insert image</span>
          </button>
        </div>
        <EditorContent
          editor={editor}
          id={inputId}
          className="rounded-b-lg [&_.ProseMirror]:min-h-[100px]"
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFileChange}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-dim">{hint}</p>}
    </div>
  );
};
