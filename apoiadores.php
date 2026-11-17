<?php
/**
 * Lua Fitwear · Lista automática de marcas
 * Lê as pastas /patrocinador-master e /apoiadores e devolve JSON para o index.html.
 *
 * Use nomes de arquivo SEM acentos e SEM espaços (ex.: 06-academia-exemplo.png).
 *   número no início   -> ordem (opcional)
 *   --branco           -> bolinha com fundo branco
 *   --cheio            -> logo preenche a bolinha inteira
 * Nome com acentos: escreva no nomes.txt da pasta (ex.: 06-academia-exemplo = Academia Exemplo São José)
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function nomes($dir) {
    $map = [];
    $f = $dir . '/nomes.txt';
    if (!is_file($f)) return $map;
    foreach (file($f, FILE_IGNORE_NEW_LINES) as $l) {
        $l = trim($l);
        if ($l === '' || $l[0] === '#' || strpos($l, '=') === false) continue;
        list($k, $v) = array_map('trim', explode('=', $l, 2));
        $map[strtolower($k)] = $v;
    }
    return $map;
}

function listar($pasta) {
    $dir = __DIR__ . '/' . $pasta;
    if (!is_dir($dir)) return [];
    $ok = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif'];
    $map = nomes($dir);
    $itens = [];
    foreach (scandir($dir) as $arq) {
        if ($arq[0] === '.') continue;
        $ext = strtolower(pathinfo($arq, PATHINFO_EXTENSION));
        if (!in_array($ext, $ok, true) || !is_file($dir . '/' . $arq)) continue;
        $base = pathinfo($arq, PATHINFO_FILENAME);
        preg_match_all('/--(branco|cheio)/i', $base, $m);
        $flags = array_map('strtolower', $m[1]);
        if (isset($map[strtolower($base)])) {
            $nome = $map[strtolower($base)];
        } else {
            $nome = preg_replace('/--(branco|cheio)/i', '', $base);
            $nome = preg_replace('/^\d+\s*[-_.]\s*/', '', $nome);
            $nome = ucwords(trim(preg_replace('/[\s_-]+/', ' ', $nome)));
        }
        $itens[] = [
            'arquivo' => $pasta . '/' . rawurlencode($arq),
            'nome'    => $nome,
            'branco'  => in_array('branco', $flags, true),
            'cheio'   => in_array('cheio', $flags, true),
            'ordem'   => $arq,
        ];
    }
    usort($itens, function ($a, $b) { return strnatcasecmp($a['ordem'], $b['ordem']); });
    foreach ($itens as &$i) unset($i['ordem']);
    return $itens;
}

echo json_encode([
    'master'     => listar('patrocinador-master'),
    'apoiadores' => listar('apoiadores'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
