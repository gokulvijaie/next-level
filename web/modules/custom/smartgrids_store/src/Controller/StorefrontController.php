<?php

namespace Drupal\smartgrids_store\Controller;

use Drupal\commerce_product\Entity\ProductInterface;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Component\Utility\Html;
use Drupal\Core\Url;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Builds the public storefront.
 */
class StorefrontController extends ControllerBase {

  /**
   * The entity type manager.
   */
  protected EntityTypeManagerInterface $storeEntityTypeManager;

  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
  ) {
    $this->storeEntityTypeManager = $entity_type_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('entity_type.manager'),
    );
  }

  /**
   * Displays a shoppable product catalog.
   */
  public function storefront(): array {
    $storage = $this->storeEntityTypeManager->getStorage('commerce_product');
    $product_ids = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', 'default')
      ->condition('status', 1)
      ->sort('changed', 'DESC')
      ->execute();

    $products = $product_ids ? $storage->loadMultiple($product_ids) : [];
    $cards = [];
    foreach ($products as $product) {
      if ($product instanceof ProductInterface) {
        $cards[] = $this->buildProductCard($product);
      }
    }

    return [
      '#attached' => [
        'library' => [
          'smartgrids_store/storefront',
        ],
      ],
      'storefront' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['smartgrids-store']],
        'hero' => [
          '#type' => 'container',
          '#attributes' => ['class' => ['smartgrids-store__hero']],
          'copy' => [
            '#type' => 'container',
            '#attributes' => ['class' => ['smartgrids-store__hero-copy']],
            'eyebrow' => [
              '#markup' => '<p class="smartgrids-store__eyebrow">' . $this->t('Digital and physical commerce') . '</p>',
            ],
            'title' => [
              '#markup' => '<h1 class="smartgrids-store__title">' . $this->t('Smartgrids Store') . '</h1>',
            ],
            'summary' => [
              '#markup' => '<p class="smartgrids-store__summary">' . $this->t('Sell books, products, PDFs, videos, movies, downloads, and any other content from one flexible catalog.') . '</p>',
            ],
          ],
          'actions' => [
            '#type' => 'container',
            '#attributes' => ['class' => ['smartgrids-store__actions']],
            'cart' => [
              '#type' => 'link',
              '#title' => $this->t('View cart'),
              '#url' => Url::fromRoute('commerce_cart.page'),
              '#attributes' => ['class' => ['smartgrids-store__button', 'smartgrids-store__button--secondary']],
            ],
          ],
        ],
        'catalog_header' => [
          '#markup' => '<div class="smartgrids-store__section-heading"><h2>' . $this->t('Catalog') . '</h2><p>' . $this->t('Choose an item and add it to the cart to start checkout.') . '</p></div>',
        ],
        'products' => [
          '#type' => 'container',
          '#attributes' => ['class' => ['smartgrids-store__grid']],
          'items' => $cards ?: [
            '#markup' => '<p class="smartgrids-store__empty">' . $this->t('No products are published yet. Add products from Commerce administration.') . '</p>',
          ],
        ],
      ],
      '#cache' => [
        'tags' => ['commerce_product_list'],
      ],
    ];
  }

  /**
   * Builds a storefront card for a product.
   */
  protected function buildProductCard(ProductInterface $product): array {
    $variation = $product->getDefaultVariation();
    $price = $variation && $variation->hasField('price') && !$variation->get('price')->isEmpty()
      ? $variation->getPrice()->__toString()
      : $this->t('Price unavailable');
    $category = $product->hasField('field_store_category') && !$product->get('field_store_category')->isEmpty()
      ? $product->get('field_store_category')->value
      : $this->t('Item');
    $summary = $product->hasField('body') && !$product->get('body')->isEmpty()
      ? $product->get('body')->summary ?: text_summary($product->get('body')->value, $product->get('body')->format, 140)
      : $this->t('A flexible store item ready for purchase.');

    $image = [
      '#markup' => '<div class="smartgrids-store-card__placeholder">' . strtoupper(substr((string) $category, 0, 1)) . '</div>',
    ];
    if ($product->hasField('field_product_image') && !$product->get('field_product_image')->isEmpty()) {
      $image = $product->get('field_product_image')->view([
        'type' => 'image',
        'label' => 'hidden',
        'settings' => [
          'image_style' => 'medium',
          'image_link' => '',
          'image_loading' => ['attribute' => 'lazy'],
        ],
      ]);
    }

    return [
      '#type' => 'container',
      '#attributes' => ['class' => ['smartgrids-store-card']],
      'image' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['smartgrids-store-card__media']],
        'content' => $image,
      ],
      'content' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['smartgrids-store-card__content']],
        'category' => [
          '#markup' => '<p class="smartgrids-store-card__category">' . Html::escape((string) $category) . '</p>',
        ],
        'title' => [
          '#markup' => '<h3 class="smartgrids-store-card__title">' . $product->toLink()->toString() . '</h3>',
        ],
        'summary' => [
          '#markup' => '<p class="smartgrids-store-card__summary">' . Html::escape((string) $summary) . '</p>',
        ],
        'footer' => [
          '#type' => 'container',
          '#attributes' => ['class' => ['smartgrids-store-card__footer']],
          'price' => [
            '#markup' => '<strong class="smartgrids-store-card__price">' . Html::escape((string) $price) . '</strong>',
          ],
          'view' => [
            '#type' => 'link',
            '#title' => $this->t('Details'),
            '#url' => $product->toUrl(),
            '#attributes' => ['class' => ['smartgrids-store-card__link']],
          ],
        ],
        'cart' => [
          '#lazy_builder' => [
            'commerce_product.lazy_builders:addToCartForm',
            [$product->id(), 'default', TRUE, $product->language()->getId()],
          ],
          '#create_placeholder' => TRUE,
        ],
      ],
    ];
  }

}
