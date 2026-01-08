import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://royalcenterve.com/',
      lastModified: new Date(),
    },
  ]
}
