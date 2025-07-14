import * as React from "react"
import { GalleryVerticalEnd } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Getting Started",
      url: "#",
      items: [
        {
          title: "Overview",
          url: "#",
        },
      ],
    },
   {
      title: "Projects",
      url: "#",
      items: [
        {
          title: "Nova",
          url: "#",
          isActive: true,
        },
        {
          title: "Ignite",
          url: "#",
        },
        {
          title: "Comet",
          url: "#",
        },
        {
          title: "Astra",
          url: "#",
        },
        {
          title: "Lumina",
          url: "#",
        },
        {
          title: "Polaris",
          url: "#",
        },
        {
          title: "Halo",
          url: "#",
        },
        {
          title: "Vega",
          url: "#",
        },
        {
          title: "Radiant",
          url: "#",
        },
        {
          title: "Solis",
          url: "#",
        },
      ],
    },
    {
      title: "Account",
      url: "#",
      items: [
        {
          title: "Settings",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Subscription",
          url: "#",
        },
      ],
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedProject?: string
  onProjectSelect?: (project: string) => void
  selectedSection?: string
  selectedSubItem?: string
  onNavigate?: (section: string, subItem: string) => void
  onLogout?: () => void
}

export function AppSidebar({ selectedProject, onProjectSelect, selectedSection, selectedSubItem, onNavigate, onLogout, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">STARFIRE</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          asChild={false}
                          isActive={
                            item.title === "Projects" 
                              ? selectedProject === subItem.title 
                              : selectedSection === item.title && selectedSubItem === subItem.title
                          }
                          onClick={() => {
                            if (item.title === "Projects" && onProjectSelect) {
                              onProjectSelect(subItem.title)
                            } else if (onNavigate) {
                              onNavigate(item.title, subItem.title)
                            }
                          }}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Logout
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
