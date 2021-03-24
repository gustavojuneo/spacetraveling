import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

import { FiCalendar, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { results: postList, next_page } = postsPagination;

  const [posts, setPosts] = useState(postList);
  const [nextPage, setNextPage] = useState<string | null>(next_page);
  const [isLoading, setIsLoading] = useState(false);

  const loadMorePosts = async (): Promise<void> => {
    setIsLoading(true);
    console.log(nextPage);
    try {
      const { results, next_page: newNextPage } = await fetch(
        nextPage
      ).then(response => response.json());

      const newPosts = results.map(post => ({
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      }));

      setNextPage(newNextPage);
      setPosts([...posts, ...newPosts]);
    } catch (err) {
      console.error('Error loading posts:', err.message);
    }
    setIsLoading(false);
  };

  const seeMoreButton = isLoading ? (
    <span>Carregando...</span>
  ) : (
    <button
      type="button"
      className={styles.loadMoreButton}
      onClick={loadMorePosts}
    >
      Carregar mais posts
    </button>
  );

  return (
    <>
      <Head>
        <title>Posts | spacetraveling.</title>
      </Head>

      <main className={commonStyles.container}>
        {posts.map(post => (
          <Link href="/" key={post.uid}>
            <a className={styles.post}>
              <h2>{post.data.title}</h2>
              <p>{post.data.subtitle}</p>

              <div className={commonStyles.postInfo}>
                <span>
                  <FiCalendar />
                  {post.first_publication_date}
                </span>
                <span>
                  <FiUser />
                  {post.data.author}
                </span>
              </div>
            </a>
          </Link>
        ))}
        {nextPage && seeMoreButton}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const { next_page, results } = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const formatedPosts = results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: { next_page, results: formatedPosts },
    },
    revalidate: 60 * 30, // 30 min
  };
};
