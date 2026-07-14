from pathlib import Path

p = Path('src/app/types.ts')
s = p.read_text().replace(
    'export type AppRoute = AppModule | "plans" | "account" | "admin";',
    'export type AppRoute = AppModule | "plans" | "account" | "profile" | "admin";',
)
p.write_text(s)

p = Path('src/app/routing.ts')
s = p.read_text()
s = s.replace('  account: "/account",\n', '  account: "/account",\n  profile: "/profile",\n', 1)
s = s.replace('    case "/account":\n      return "account";\n', '    case "/account":\n      return "account";\n    case "/profile":\n      return "profile";\n', 1)
p.write_text(s)

p = Path('src/app/routing.test.ts')
s = p.read_text().replace(
    '    ["/account/", "account"],\n',
    '    ["/account/", "account"],\n    ["/profile", "profile"],\n    ["/profile/", "profile"],\n',
    1,
)
p.write_text(s)

p = Path('src/App.tsx')
s = p.read_text()
s = s.replace(
    'const AdminPage = lazy(() =>\n',
    'const PlayerProfilePage = lazy(() =>\n'
    '  import("@features/player-profile/components/PlayerProfilePage").then((module) => ({\n'
    '    default: module.PlayerProfilePage,\n'
    '  })),\n'
    ');\n'
    'const AdminPage = lazy(() =>\n',
    1,
)
profile_route = '''      {route === "profile" && (
        <>
          <ModuleHeader
            eyebrow="Mi perfil"
            title="Estadísticas de Albion"
            description="Vincula un personaje público, consulta tu resumen PvP y revisa la actividad reciente."
          />
          <Suspense fallback={<ModuleFallback label="perfil de Albion" />}>
            <PlayerProfilePage onNavigate={navigateTo} />
          </Suspense>
        </>
      )}
'''
s = s.replace('      {route === "admin" && (\n', profile_route + '      {route === "admin" && (\n', 1)
p.write_text(s)

p = Path('src/features/account/components/AccountMenu.tsx')
s = p.read_text()
profile_button = '''          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <UserIcon className="h-4 w-4" />
            Mi perfil
          </button>
'''
needle = '''          <button
            type="button"
            onClick={() => onNavigate("plans")}
'''
s = s.replace(needle, profile_button + needle, 1)
p.write_text(s)
