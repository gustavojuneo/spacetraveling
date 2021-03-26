import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { parsePtBrDate } from '../../utils/parsePtBrDate';
import { Comments } from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  uid: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost: Post | null;
  prevPost: Post | null;
}

export default function Post({
  post,
  preview,
  nextPost,
  prevPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <>
        <Header />
        <div className={commonStyles.container}>Carregando...</div>
      </>
    );
  }

  const humanWordsPerMinute = 200;
  const titleWords = post.data.title.split(' ').length;

  const contentWords = post.data.content.reduce((acc, content) => {
    const headingWords = content.heading
      ? content.heading.split(' ').length
      : 0;

    const bodyWords = RichText.asText(content.body).split(' ').length;

    // eslint-disable-next-line no-param-reassign
    acc += headingWords + bodyWords;
    return acc;
  }, 0);

  const timeToRead = Math.ceil(
    (titleWords + contentWords) / humanWordsPerMinute
  );

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling.</title>
        <meta name="description" content={post.data.title} />
      </Head>

      <Header />

      <div className={styles.hero}>
        <img src={post.data.banner.url} alt={post.data.title} />
      </div>

      <article className={`${commonStyles.container} ${styles.post}`}>
        <h1>{post.data.title}</h1>
        <div className={commonStyles.postInfo}>
          <span>
            <FiCalendar />
            {parsePtBrDate(post.first_publication_date)}
          </span>

          <span>
            <FiUser />
            {post.data.author}
          </span>

          <span>
            <FiClock />
            {timeToRead} min
          </span>
        </div>
        {post.first_publication_date !== post.last_publication_date && (
          <div className={styles.editedPost}>
            <p>*editado em {parsePtBrDate(post.last_publication_date)}</p>
          </div>
        )}
        {post.data.content.map(content => (
          <div key={content.heading} className={styles.postContent}>
            <h2>{content.heading}</h2>
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
        <div className={styles.navigateTool}>
          {prevPost && (
            <Link href={`/post/${prevPost.uid}`}>
              <a className={styles.previous}>
                {prevPost.data.title}
                <span>Post anterior</span>
              </a>
            </Link>
          )}
          {nextPost && (
            <Link href={`/post/${nextPost.uid}`}>
              <a className={styles.next}>
                {nextPost.data.title}
                <span>Próximo post</span>
              </a>
            </Link>
          )}
        </div>
        {preview && (
          <aside className={commonStyles.exitPreview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </article>
      <div className={commonStyles.content} id="comments">
        <Comments />
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
    }
  );

  const paths = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params: { slug },
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      notFound: true,
    };
  }

  const prevPost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
      fetch: ['posts.title'],
    })
  ).results[0];

  const nextPost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
      fetch: ['posts.title'],
    })
  ).results[0];

  const formatedPost = {
    data: {
      banner: {
        url: response.data.banner.url,
      },
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      content: response.data.content,
    },
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
  };

  return {
    props: {
      post: formatedPost,
      preview,
      prevPost: prevPost ?? null,
      nextPost: nextPost ?? null,
    },
    revalidate: 60 * 60, // 1 hour
  };
};
