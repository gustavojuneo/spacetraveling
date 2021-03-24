import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { parsePtBrDate } from '../../utils/parsePtBrDate';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps): JSX.Element {
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
        {post.data.content.map(content => (
          <div key={content.heading} className={styles.postContent}>
            <h2>{content.heading}</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
      </article>
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

export const getStaticProps: GetStaticProps = async ({ params: { slug } }) => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  if (!response) {
    return {
      notFound: true,
    };
  }

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
  };

  return {
    props: {
      post: formatedPost,
    },
    revalidate: 60 * 60, // 1 hour
  };
};
