import {
  lexicalEditor, BlocksFeature, BlockquoteFeature, BoldFeature, FixedToolbarFeature,
  HeadingFeature, InlineToolbarFeature, ItalicFeature, LinkFeature, OrderedListFeature,
  ParagraphFeature, UnorderedListFeature,
} from '@payloadcms/richtext-lexical'

export const articleEditor = lexicalEditor({
  features: [
    ParagraphFeature(), HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(), ItalicFeature(), OrderedListFeature(), UnorderedListFeature(),
    BlockquoteFeature(), LinkFeature({ enabledCollections: [], disableAutoLinks: true }),
    BlocksFeature({ blocks: [{
      slug: 'image', fields: [
        { name: 'image', type: 'relationship', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', maxLength: 600 },
      ],
    }] }),
    FixedToolbarFeature(), InlineToolbarFeature(),
  ],
})
