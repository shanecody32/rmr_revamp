'use client'


import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CheckSquareOutlined,
  CodeOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  MessageOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import {CharacterCount} from '@tiptap/extension-character-count';
import {Color} from '@tiptap/extension-color';
import {Highlight} from '@tiptap/extension-highlight';
import {Image} from '@tiptap/extension-image';
import {Link} from '@tiptap/extension-link';
import {Placeholder} from '@tiptap/extension-placeholder';
import {Subscript} from '@tiptap/extension-subscript';
import {Superscript} from '@tiptap/extension-superscript';
import {Table} from '@tiptap/extension-table';
import {TableCell} from '@tiptap/extension-table-cell';
import {TableHeader} from '@tiptap/extension-table-header';
import {TableRow} from '@tiptap/extension-table-row';
import {TaskItem} from '@tiptap/extension-task-item';
import {TaskList} from '@tiptap/extension-task-list';
import {TextAlign} from '@tiptap/extension-text-align';
import {TextStyle} from '@tiptap/extension-text-style';
import {Typography as TiptapTypography} from '@tiptap/extension-typography';
import {Underline} from '@tiptap/extension-underline';
import {BubbleMenu} from '@tiptap/react/menus';
import {EditorContent, useEditor} from '@tiptap/react';
import {StarterKit} from '@tiptap/starter-kit';
import {Button, Divider, Space, Tooltip} from 'antd';

interface WysiwygInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
}

const WysiwygInput: React.FC<WysiwygInputProps> = ({value = '', onChange, placeholder = 'Write something...'}) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 hover:text-blue-700 underline',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            TiptapTypography,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Subscript,
            Superscript,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            CharacterCount.configure({
                limit: 10000,
            }),
        ],
        content: value,
        onUpdate: ({editor}) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
            },
        },
    });

    if (!editor) {
        return null;
    }

    const addLink = () => {
        const url = window.prompt('Enter URL');
        if (url) {
            editor.chain().focus().setLink({href: url}).run();
        }
    };

    const addImage = () => {
        const url = window.prompt('Enter image URL');
        if (url) {
            editor.chain().focus().setImage({src: url}).run();
        }
    };

    const addTable = () => {
        editor.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run();
    };

    return (
        <div className="border rounded-md overflow-hidden bg-white">
            {editor && (
                <BubbleMenu editor={editor}>
                    <Space className="bg-white border rounded-lg shadow-lg p-1">
                        <Button.Group size="small">
                            <Button
                                type={editor.isActive('bold') ? 'primary' : 'text'}
                                icon={<BoldOutlined/>}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                            />
                            <Button
                                type={editor.isActive('italic') ? 'primary' : 'text'}
                                icon={<ItalicOutlined/>}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                            />
                            <Button
                                type={editor.isActive('underline') ? 'primary' : 'text'}
                                icon={<UnderlineOutlined/>}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                            />
                        </Button.Group>
                        <Button
                            type={editor.isActive('link') ? 'primary' : 'text'}
                            size="small"
                            icon={<LinkOutlined/>}
                            onClick={addLink}
                        />
                    </Space>
                </BubbleMenu>
            )}

            <div className="border-b bg-gray-50 p-2">
                <Space wrap>
                    <Button.Group size="small">
                        <Tooltip title="Bold">
                            <Button
                                type={editor.isActive('bold') ? 'primary' : 'text'}
                                icon={<BoldOutlined/>}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Italic">
                            <Button
                                type={editor.isActive('italic') ? 'primary' : 'text'}
                                icon={<ItalicOutlined/>}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Underline">
                            <Button
                                type={editor.isActive('underline') ? 'primary' : 'text'}
                                icon={<UnderlineOutlined/>}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Strike">
                            <Button
                                type={editor.isActive('strike') ? 'primary' : 'text'}
                                icon={<StrikethroughOutlined/>}
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Bullet List">
                            <Button
                                type={editor.isActive('bulletList') ? 'primary' : 'text'}
                                icon={<UnorderedListOutlined/>}
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Ordered List">
                            <Button
                                type={editor.isActive('orderedList') ? 'primary' : 'text'}
                                icon={<OrderedListOutlined/>}
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Task List">
                            <Button
                                type={editor.isActive('taskList') ? 'primary' : 'text'}
                                icon={<CheckSquareOutlined/>}
                                onClick={() => editor.chain().focus().toggleTaskList().run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Align Left">
                            <Button
                                type={editor.isActive({textAlign: 'left'}) ? 'primary' : 'text'}
                                icon={<AlignLeftOutlined/>}
                                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            />
                        </Tooltip>
                        <Tooltip title="Align Center">
                            <Button
                                type={editor.isActive({textAlign: 'center'}) ? 'primary' : 'text'}
                                icon={<AlignCenterOutlined/>}
                                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            />
                        </Tooltip>
                        <Tooltip title="Align Right">
                            <Button
                                type={editor.isActive({textAlign: 'right'}) ? 'primary' : 'text'}
                                icon={<AlignRightOutlined/>}
                                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Code">
                            <Button
                                type={editor.isActive('code') ? 'primary' : 'text'}
                                icon={<CodeOutlined/>}
                                onClick={() => editor.chain().focus().toggleCode().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Blockquote">
                            <Button
                                type={editor.isActive('blockquote') ? 'primary' : 'text'}
                                icon={<MessageOutlined/>}
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Subscript">
                            <Button
                                type={editor.isActive('subscript') ? 'primary' : 'text'}
                                icon={<VerticalAlignBottomOutlined/>}
                                onClick={() => editor.chain().focus().toggleSubscript().run()}
                            />
                        </Tooltip>
                        <Tooltip title="Superscript">
                            <Button
                                type={editor.isActive('superscript') ? 'primary' : 'text'}
                                icon={<VerticalAlignTopOutlined/>}
                                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Link">
                            <Button
                                type={editor.isActive('link') ? 'primary' : 'text'}
                                icon={<LinkOutlined/>}
                                onClick={addLink}
                            />
                        </Tooltip>
                        <Tooltip title="Image">
                            <Button
                                type="text"
                                icon={<PictureOutlined/>}
                                onClick={addImage}
                            />
                        </Tooltip>
                        <Tooltip title="Table">
                            <Button
                                type={editor.isActive('table') ? 'primary' : 'text'}
                                icon={<TableOutlined/>}
                                onClick={addTable}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Text Color">
                            <Button
                                type="text"
                                icon={<FontColorsOutlined/>}
                                onClick={() => editor.chain().focus().setColor('#958DF1').run()}
                            />
                        </Tooltip>
                        <Tooltip title="Highlight">
                            <Button
                                type={editor.isActive('highlight') ? 'primary' : 'text'}
                                icon={<HighlightOutlined/>}
                                onClick={() => editor.chain().focus().toggleHighlight().run()}
                            />
                        </Tooltip>
                    </Button.Group>

                    <Divider type="vertical"/>

                    <Button.Group size="small">
                        <Tooltip title="Undo">
                            <Button
                                type="text"
                                icon={<UndoOutlined/>}
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                            />
                        </Tooltip>
                        <Tooltip title="Redo">
                            <Button
                                type="text"
                                icon={<RedoOutlined/>}
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                            />
                        </Tooltip>
                    </Button.Group>
                </Space>
            </div>

            <div className="relative">
                <EditorContent editor={editor}/>
            </div>

            <div className="text-right text-sm text-gray-500 px-4 py-2 border-t">
                {editor.storage.characterCount.characters()} characters
            </div>

            <style jsx global>{`
                /* Basic editor styles */
                .ProseMirror {
                    min-height: 200px;
                    padding: 1rem;
                    border-radius: 0 0 0.5rem 0.5rem;
                    background: white;
                    border: 1px solid transparent;
                    transition: border-color 0.15s ease;
                }

                .ProseMirror:focus {
                    outline: none;
                    border-color: #1677ff;
                    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
                }

                /* Typography */
                .ProseMirror > * + * {
                    margin-top: 0.75em;
                }

                .ProseMirror p {
                    margin: 0;
                    line-height: 1.6;
                }

                /* Headings */
                .ProseMirror h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }

                .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }

                .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }

                /* Lists */
                .ProseMirror ul,
                .ProseMirror ol {
                    padding: 0 1.2rem;
                    margin: 0.5em 0;
                }

                .ProseMirror li {
                    margin: 0.2em 0;
                }

                .ProseMirror li > p {
                    margin: 0;
                }

                .ProseMirror ul li {
                    list-style-type: disc;
                }

                .ProseMirror ol li {
                    list-style-type: decimal;
                }

                /* Task Lists */
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }

                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    margin: 0.5em 0;
                }

                .ProseMirror ul[data-type="taskList"] li > label {
                    margin-right: 0.5em;
                    user-select: none;
                }

                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1;
                }

                /* Tables */
                .ProseMirror table {
                    border-collapse: collapse;
                    margin: 1em 0;
                    overflow: hidden;
                    width: 100%;
                    table-layout: fixed;
                }

                .ProseMirror table td,
                .ProseMirror table th {
                    border: 2px solid #e5e7eb;
                    padding: 0.5em;
                    vertical-align: top;
                }

                .ProseMirror table th {
                    background-color: #f3f4f6;
                    font-weight: bold;
                }

                /* Blockquotes */
                .ProseMirror blockquote {
                    border-left: 3px solid #e5e7eb;
                    padding-left: 1rem;
                    margin: 1rem 0;
                    color: #4b5563;
                    font-style: italic;
                }

                /* Code */
                .ProseMirror code {
                    background-color: #f3f4f6;
                    padding: 0.2em 0.4em;
                    border-radius: 0.25em;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                    font-size: 0.9em;
                }

                /* Images */
                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    margin: 1em 0;
                }

                /* Placeholder */
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #9ca3af;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }

                /* Selection */
                .ProseMirror ::selection {
                    background: rgba(22, 119, 255, 0.2);
                }

                /* Text alignment */
                .ProseMirror .text-left {
                    text-align: left;
                }

                .ProseMirror .text-center {
                    text-align: center;
                }

                .ProseMirror .text-right {
                    text-align: right;
                }

                /* Highlight */
                .ProseMirror mark {
                    background-color: #fef3c7;
                    border-radius: 0.25em;
                    padding: 0.1em 0.3em;
                }
            `}</style>
        </div>
    );
};

export {WysiwygInput};
export type {WysiwygInputProps};