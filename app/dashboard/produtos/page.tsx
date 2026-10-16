"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
};

type SuggestionType = "product" | "brand";

export default function ProdutosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [productFocused, setProductFocused] = useState(false);
  const [brandFocused, setBrandFocused] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState<SuggestionType | null>(null);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const suggestionTimers = useRef<{ product: number | null; brand: number | null }>({
    product: null,
    brand: null,
  });

  const getCompanyId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data.company_id;
  }, [router]);

  const loadProducts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const id = await getCompanyId();

    if (!id) {
      setLoading(false);
      return;
    }

    setCompanyId(id);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, description, price, image_url")
      .eq("company_id", id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }, [getCompanyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  function uniqueSuggestions(values: string[]) {
    return Array.from(
      new Map(values.filter(Boolean).map((value) => [value.toLocaleLowerCase(), value])).values(),
    );
  }

  function localSuggestions(type: SuggestionType, query: string) {
    const values = products.flatMap((product) =>
      type === "product"
        ? [product.name]
        : product.brand
          ? product.brand.split(",").map((item) => item.trim())
          : [],
    );
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return uniqueSuggestions(values).filter((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    );
  }

  function scheduleSuggestions(type: SuggestionType, query: string) {
    if (suggestionTimers.current[type]) {
      window.clearTimeout(suggestionTimers.current[type]!);
    }

    if (!query.trim()) {
      if (type === "product") setProductSuggestions([]);
      if (type === "brand") setBrandSuggestions([]);
      return;
    }

    suggestionTimers.current[type] = window.setTimeout(() => {
      void fetchSuggestions(type, query);
    }, 450);
  }

  async function fetchSuggestions(type: SuggestionType, query: string) {
    setSuggestionLoading(type);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch("/api/products/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type,
          query,
          product: name,
          brand: selectedBrands.join(", "),
        }),
      });
      const data = await response.json() as { suggestions?: string[] };
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

      if (type === "product") setProductSuggestions(suggestions);
      if (type === "brand") setBrandSuggestions(suggestions);
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
    } finally {
      setSuggestionLoading(null);
    }
  }

  async function generateDescription(productValue: string, brandValue: string, force = false) {
    if (!productValue.trim() || (descriptionEdited && !force)) return;

    setDescriptionLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch("/api/products/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "description",
          product: productValue,
          brand: brandValue,
        }),
      });
      const data = await response.json() as { description?: string };

      if (data.description && (!descriptionEdited || force)) {
        setDescription(data.description);
        setDescriptionEdited(false);
      }
    } catch (error) {
      console.error("Erro ao gerar descrição:", error);
    } finally {
      setDescriptionLoading(false);
    }
  }

  function normalizedBrands(value: string) {
    return uniqueSuggestions(value.split(",").map((item) => item.trim())).join(", ");
  }

  function formatPriceInput(value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits) return "";

    return (Number(digits) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function parsePriceInput(value: string) {
    return Number(value.replace(/\D/g, "")) / 100;
  }

  function splitBrands(value: string | null) {
    return value ? uniqueSuggestions(value.split(",").map((item) => item.trim())) : [];
  }

  function addBrandsFromInput(value: string) {
    const newBrands = splitBrands(value);

    if (newBrands.length === 0) return;

    const nextBrands = uniqueSuggestions([...selectedBrands, ...newBrands]);
    setSelectedBrands(nextBrands);
    setBrand("");
    setBrandFocused(false);
    setBrandSuggestions([]);
    void generateDescription(name, nextBrands.join(", "));
  }

  function removeBrand(brandToRemove: string) {
    const nextBrands = selectedBrands.filter((item) => item !== brandToRemove);
    setSelectedBrands(nextBrands);
    void generateDescription(name, nextBrands.join(", "));
  }

  function clearForm() {
    setEditingProductId(null);
    setName("");
    setBrand("");
    setSelectedBrands([]);
    setDescription("");
    setDescriptionEdited(false);
    setPrice("");
    setImageUrl(null);
    setImagePreview(null);
    setImageFile(null);
    setImageRemoved(false);
    setProductSuggestions([]);
    setBrandSuggestions([]);
  }

  function startEditing(product: Product) {
    setEditingProductId(product.id);
    setName(product.name);
    setBrand("");
    setSelectedBrands(splitBrands(product.brand));
    setDescription(product.description || "");
    setDescriptionEdited(true);
    setPrice(product.price === null ? "" : formatPriceInput(String(Math.round(product.price * 100))));
    setImageUrl(product.image_url);
    setImagePreview(product.image_url);
    setImageFile(null);
    setImageRemoved(false);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSuccess(false);
      setMessage("Escolha um arquivo de imagem válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSuccess(false);
      setMessage("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setImageFile(file);
    setImageUrl(null);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  function removeImage() {
    setImageFile(null);
    setImageUrl(null);
    setImagePreview(null);
    setImageRemoved(true);
  }

  async function uploadImage() {
    if (!imageFile || !companyId) return imageUrl;

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${companyId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false });

    if (error) {
      console.error(error);
      throw new Error("Não foi possível enviar a imagem.");
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProduct() {
    setMessage("");
    setSuccess(false);

    if (!companyId) return;

    if (!name.trim()) {
      setMessage("Digite o nome do produto.");
      return;
    }

    const brandsToSave = normalizedBrands(
      [...selectedBrands, ...splitBrands(brand)].join(", "),
    );

    if (!brandsToSave) {
      setMessage("Adicione pelo menos uma marca.");
      return;
    }

    if (!description.trim()) {
      setMessage("Digite ou gere uma descrição para o produto.");
      return;
    }

    if (!price.trim()) {
      setMessage("Digite o preço do produto.");
      return;
    }

    const parsedPrice = parsePriceInput(price);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setMessage("Digite um preço válido.");
      return;
    }

    setSaving(true);

    let savedImageUrl = imageUrl;

    try {
      if (imageFile) savedImageUrl = await uploadImage();
    } catch (error) {
      console.error(error);
      setSaving(false);
      setSuccess(false);
      setMessage("Não foi possível enviar a imagem.");
      return;
    }

    const productData = {
      name: name.trim(),
      brand: brandsToSave,
      description: description.trim() || null,
      price: price.trim() ? parsedPrice : null,
      image_url: imageRemoved ? null : savedImageUrl,
    };

    const query = editingProductId
      ? supabase.from("products").update(productData).eq("id", editingProductId).eq("company_id", companyId)
      : supabase.from("products").insert({ ...productData, company_id: companyId });
    const { error } = await query;

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage(editingProductId ? "Erro ao atualizar produto." : "Erro ao cadastrar produto.");
      return;
    }

    const wasEditing = Boolean(editingProductId);
    if (editingProductId) {
      setProducts((currentProducts) => currentProducts.map((product) =>
        product.id === editingProductId
          ? { ...product, id: editingProductId, ...productData }
          : product,
      ));
    }
    clearForm();
    setSuccess(true);
    setMessage(wasEditing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    await loadProducts(false);
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) return;

    setMessage("");
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("company_id", companyId);

    if (error) {
      console.error(error);
      setSuccess(false);
      setMessage("Erro ao excluir produto.");
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter((currentProduct) => currentProduct.id !== product.id),
    );

    if (editingProductId === product.id) clearForm();
    setSuccess(true);
    setMessage("Produto excluído com sucesso.");
    await loadProducts(false);
  }

  function formatPrice(value: number | null) {
    if (value === null) return "Preço sob consulta";

    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const productOptions = uniqueSuggestions([
    ...localSuggestions("product", name),
    ...productSuggestions,
  ]).slice(0, 8);
  const brandOptions = uniqueSuggestions([
    ...localSuggestions("brand", brand),
    ...brandSuggestions,
  ]).slice(0, 8);

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          Carregando produtos...
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-1">Catálogo</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Produtos</h1>
          <p className="text-slate-500 mt-2">
            Cadastre os produtos disponíveis no salão para a IA apresentar e explicar aos clientes.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              {editingProductId ? "Editar produto" : "Novo produto"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {editingProductId
                ? "Altere as informações que a IA usará para apresentar o produto."
                : "Adicione as informações que ajudam o cliente a conhecer o produto."}
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do produto</label>
                <input
                  type="text"
                  placeholder="Ex: Máscara de hidratação"
                  value={name}
                  onFocus={() => setProductFocused(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    setProductFocused(true);
                    scheduleSuggestions("product", value);
                  }}
                  className="w-full h-12 border border-slate-300 rounded-xl px-4 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                />
                {productFocused && name.trim() && productOptions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {productOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setName(option);
                          setProductFocused(false);
                          void generateDescription(option, selectedBrands.join(", "));
                        }}
                        className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {productFocused && suggestionLoading === "product" && (
                  <p className="absolute z-10 left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-lg">
                    Buscando sugestões...
                  </p>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Marca</label>
                <div className="min-h-12 w-full flex flex-wrap items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white focus-within:border-slate-500 focus-within:ring-4 focus-within:ring-slate-100">
                  {selectedBrands.map((selectedBrand) => (
                    <span key={selectedBrand} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                      {selectedBrand}
                      <button
                        type="button"
                        aria-label={`Remover marca ${selectedBrand}`}
                        onClick={() => removeBrand(selectedBrand)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 hover:text-slate-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={selectedBrands.length > 0 ? "Adicionar marca" : "Ex: Kérastase"}
                    value={brand}
                    onFocus={() => setBrandFocused(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addBrandsFromInput(brand);
                      }
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBrand(value);
                      setBrandFocused(true);
                      scheduleSuggestions("brand", value);
                    }}
                    className="flex-1 min-w-[150px] h-7 border-0 p-0 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Escolha uma sugestão ou pressione Enter para transformar a marca em uma tag.
                </p>
                {brandFocused && brand.trim() && brandOptions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {brandOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          addBrandsFromInput(option);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {brandFocused && suggestionLoading === "brand" && (
                  <p className="absolute z-10 left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-lg">
                    Buscando marcas...
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-medium text-slate-700">Descrição</label>
                <button
                  type="button"
                  onClick={() => void generateDescription(name, selectedBrands.join(", "), true)}
                  disabled={descriptionLoading || !name.trim()}
                  className="text-sm font-medium text-slate-700 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {descriptionLoading ? "Gerando..." : "Gerar com IA"}
                </button>
              </div>
              <textarea
                placeholder="Ex: Tratamento indicado para cabelos ressecados, com ação nutritiva e efeito de maciez."
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setDescriptionEdited(true);
                }}
                rows={3}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 outline-none resize-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              />
              <p className="text-xs text-slate-400 mt-2">
                {descriptionLoading
                  ? "Gerando uma descrição com base no produto e na marca..."
                  : "Escolha uma sugestão para gerar uma descrição automaticamente. Você também pode editá-la."}
              </p>
            </div>

            <div className="max-w-sm">
              <label className="block text-sm font-medium text-slate-700 mb-2">Preço</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={price}
                  onChange={(event) => setPrice(formatPriceInput(event.target.value))}
                  className="w-full h-12 border border-slate-300 rounded-xl px-4 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Imagem do produto (opcional)</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {imagePreview ? (
                  <div
                    role="img"
                    aria-label="Prévia do produto"
                    className="w-24 h-24 rounded-2xl bg-center bg-cover border border-slate-200"
                    style={{ backgroundImage: `url(${imagePreview})` }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl text-slate-400">▣</div>
                )}
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {imagePreview ? "Trocar imagem" : "Escolher imagem"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => handleImageChange(event.target.files?.[0])}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">PNG, JPG ou WEBP de até 5 MB.</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => void saveProduct()}
              disabled={saving}
              className="h-12 px-6 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving
                ? editingProductId ? "Salvando..." : "Adicionando..."
                : editingProductId ? "Salvar alterações" : "Adicionar produto"}
            </button>
            {editingProductId && (
              <button
                type="button"
                onClick={clearForm}
                disabled={saving}
                className="h-12 px-6 ml-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Cancelar edição
              </button>
            )}
          </div>

          {message && (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-600"}`}>
              {message}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">Produtos cadastrados</h2>
              <p className="text-sm text-slate-500 mt-1">
                {products.length} {products.length === 1 ? "produto ativo" : "produtos ativos"}
              </p>
            </div>
            <div className="min-w-9 h-9 px-2 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
              {products.length}
            </div>
          </div>

          {products.length === 0 && (
            <div className="py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-xl">▣</div>
              <h3 className="font-semibold text-slate-900">Nenhum produto cadastrado</h3>
              <p className="text-sm text-slate-500 mt-1">Cadastre o primeiro produto vendido pelo salão.</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="divide-y divide-slate-200">
              {products.map((product) => (
                <div key={product.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      {product.image_url ? (
                        <div
                          role="img"
                          aria-label={`Imagem de ${product.name}`}
                          className="w-14 h-14 rounded-xl bg-center bg-cover shrink-0"
                          style={{ backgroundImage: `url(${product.image_url})` }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-semibold shrink-0">▣</div>
                      )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-950">{product.name}</h3>
                    {product.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {product.brand && splitBrands(product.brand).map((productBrand) => (
                        <span key={productBrand} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {productBrand}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-lg font-bold text-slate-950">{formatPrice(product.price)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">produto do salão</p>
                    <div className="flex items-center justify-end gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => startEditing(product)}
                        className="text-sm font-medium text-slate-700 hover:text-slate-950"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(product)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
