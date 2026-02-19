export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  tags?: string[];
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  content: string;
};

export type BlogListItem = BlogFrontmatter & {
  slug: string;
};
